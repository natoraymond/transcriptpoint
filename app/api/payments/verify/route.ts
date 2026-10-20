import { NextResponse } from "next/server";
import { Resend } from "resend";
import { checkSameOrigin, getCurrentUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { formatNaira } from "../../../lib/transcript-options";

export const dynamic = "force-dynamic";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function receiptHtml(request: Record<string, unknown>, service: string, amount: string, reference: string) {
  const rows = [
    ["Applicant", `${request.firstName} ${request.otherName} ${request.surname}`],
    ["Matriculation number", request.matriculationNumber],
    ["Service", service],
    ["Graduation", `${request.monthOfGraduation} ${request.yearOfGraduation}`],
    ["Recipient institution", request.recipientInstitution],
    ["Delivery method", request.deliveryMethod],
    ["Payment reference", reference],
    ["Amount paid", amount],
  ];

  const details = rows
    .map(([label, value]) => `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#475569">${escapeHtml(label)}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600">${escapeHtml(value)}</td></tr>`)
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:#173c5c;padding:28px;text-align:center;color:#fff"><div style="font-size:22px;letter-spacing:2px">TranscriptPoint</div><div style="margin-top:8px;font-size:16px">Payment receipt</div></div><div style="padding:28px"><p>Dear ${escapeHtml(`${request.firstName} ${request.surname}`)},</p><p>We have received your payment for your transcript request. Your request details are below.</p><table style="width:100%;border-collapse:collapse">${details}</table><p style="margin-top:24px;color:#475569">Thank you for using TranscriptPoint. Please keep this email as your payment receipt.</p></div></div></body></html>`;
}

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  let body: { requestId?: unknown; reference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId : String(body.requestId ?? "");
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!/^\d+$/.test(requestId) || !/^[A-Za-z0-9._-]{1,100}$/.test(reference)) {
    return NextResponse.json({ error: "A valid request ID and payment reference are required" }, { status: 400 });
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!paystackSecret || !resendApiKey || !emailFrom) {
    console.error("Payment receipt email is not configured");
    return NextResponse.json({ error: "Payment confirmation is not configured" }, { status: 503 });
  }

  try {
    const sql = getDatabase();
    const [savedRequest] = await sql`
      SELECT id, first_name AS "firstName", other_name AS "otherName", surname,
        matriculation_number AS "matriculationNumber", email, transcript_format AS "transcriptFormat",
        month_of_graduation AS "monthOfGraduation", year_of_graduation AS "yearOfGraduation",
        recipient_institution AS "recipientInstitution", delivery_method AS "deliveryMethod",
        payment_status AS "paymentStatus", payment_reference AS "paymentReference",
        payment_email_sent_at AS "paymentEmailSentAt", user_id AS "userId"
      FROM transcript_requests
      WHERE id = ${requestId}
      LIMIT 1
    `;

    if (!savedRequest) {
      return NextResponse.json({ error: "Transcript request not found" }, { status: 404 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser || (savedRequest.userId && currentUser.id !== String(savedRequest.userId)) || currentUser.email !== String(savedRequest.email).toLowerCase()) {
      return NextResponse.json({ error: "Sign in with the account used to submit this request before confirming payment" }, { status: 403 });
    }

    const [transcriptOption] = await sql`
      SELECT label, amount_ngn AS amount
      FROM transcript_options
      WHERE value = ${String(savedRequest.transcriptFormat)}
      LIMIT 1
    `;
    if (!transcriptOption) {
      return NextResponse.json({ error: "The saved transcript service is invalid" }, { status: 400 });
    }
    const amountNgn = Number(transcriptOption.amount);

    const verificationResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` }, cache: "no-store" },
    );
    const verification = (await verificationResponse.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        customer?: { email?: string };
      };
    };
    const transaction = verification.data;

    if (
      !verificationResponse.ok || !verification.status || transaction?.status !== "success" ||
      transaction.reference !== reference || transaction.amount !== amountNgn * 100 ||
      transaction.currency !== "NGN" || transaction.customer?.email?.toLowerCase() !== String(savedRequest.email).toLowerCase()
    ) {
      return NextResponse.json({ error: "The payment could not be verified for this request" }, { status: 400 });
    }

    if (savedRequest.paymentReference && savedRequest.paymentReference !== reference) {
      return NextResponse.json({ error: "A different payment has already been recorded for this request" }, { status: 409 });
    }

    await sql`
      UPDATE transcript_requests
        SET payment_status = 'paid', payment_reference = ${reference},
          user_id = COALESCE(user_id, ${currentUser.id}), updated_at = NOW()
      WHERE id = ${requestId}
    `;

    if (savedRequest.paymentEmailSentAt) {
      return NextResponse.json({ paymentConfirmed: true, emailSent: true });
    }

    const amount = formatNaira(amountNgn);
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: emailFrom,
      to: String(savedRequest.email),
      subject: `Payment received — ${transcriptOption.label}`,
      html: receiptHtml(savedRequest as Record<string, unknown>, transcriptOption.label, amount, reference),
      text: [
        `Dear ${savedRequest.firstName} ${savedRequest.surname},`,
        "We have received your payment for your transcript request.",
        `Service: ${transcriptOption.label}`,
        `Matriculation number: ${savedRequest.matriculationNumber}`,
        `Graduation: ${savedRequest.monthOfGraduation} ${savedRequest.yearOfGraduation}`,
        `Recipient institution: ${savedRequest.recipientInstitution}`,
        `Payment reference: ${reference}`,
        `Amount paid: ${amount}`,
        "Thank you for using TranscriptPoint.",
      ].join("\n"),
    });

    if (emailError) {
      console.error("Unable to send payment receipt email", emailError);
      return NextResponse.json({ paymentConfirmed: true, emailSent: false }, { status: 502 });
    }

    await sql`
      UPDATE transcript_requests
      SET payment_email_sent_at = NOW(), updated_at = NOW()
      WHERE id = ${requestId} AND payment_reference = ${reference}
    `;

    return NextResponse.json({ paymentConfirmed: true, emailSent: true });
  } catch (error) {
    console.error("Unable to verify payment or send receipt", error);
    return NextResponse.json({ error: "Unable to confirm payment or send receipt" }, { status: 500 });
  }
}