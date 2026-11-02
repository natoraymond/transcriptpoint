import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import { getDatabase } from "../../lib/db";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantRequest = {
  conversationId?: string;
  message?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getConversationMessages(conversationId: string) {
  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT role, content
      FROM assistant_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT 12
    `;
    return rows as ChatMessage[];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  try {
    const body = (await request.json()) as AssistantRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Enter a question for support" }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "Please keep your question under 2,000 characters" }, { status: 400 });
    }

    const sql = getDatabase();

    const fallbackTranscriptOptions = [
      { label: "Official Softcopy (Nigeria)", amount: 17000, category: "Softcopy transcript", requiresDhl: false },
      { label: "Official Softcopy (Outside Nigeria)", amount: 29000, category: "Softcopy transcript", requiresDhl: false },
      { label: "Softcopy Transcript / English Proficiency (Nigeria)", amount: 22000, category: "Softcopy transcript", requiresDhl: false },
      { label: "Softcopy Transcript / English Proficiency (Outside Nigeria)", amount: 34000, category: "Softcopy transcript", requiresDhl: false },
      { label: "Softcopy English Proficiency (Nigeria)", amount: 8000, category: "Softcopy transcript", requiresDhl: false },
      { label: "Students Softcopy", amount: 7000, category: "Other services", requiresDhl: false },
      { label: "Hardcopy Transcript", amount: 0, category: "Hardcopy transcript", requiresDhl: true },
      { label: "Transcript Verification", amount: 12000, category: "Other services", requiresDhl: false },
      { label: "Certificate Verification", amount: 12000, category: "Other services", requiresDhl: false },
    ];

    let activeTranscriptOptions: Array<{ label: string; amount: number; category: string; requiresDhl: boolean }> = [];
    try {
      const rows = await sql`
        SELECT label, amount_ngn AS amount, category, requires_dhl AS "requiresDhl"
        FROM transcript_options
        WHERE is_active = TRUE
        ORDER BY display_order, label
      `;
      activeTranscriptOptions = rows.map((r) => ({
        label: String(r.label),
        amount: Number(r.amount),
        category: String(r.category),
        requiresDhl: Boolean(r.requiresDhl),
      }));
    } catch {
      activeTranscriptOptions = fallbackTranscriptOptions;
    }
    if (activeTranscriptOptions.length === 0) {
      activeTranscriptOptions = fallbackTranscriptOptions;
    }

    // 2. Fetch sample DHL rates from database
    let dhlSampleRates: Array<{ country: string; state: string; price: number }> = [];
    try {
      const rows = await sql`
        SELECT country_name AS country, state_name AS state, price_kobo AS price
        FROM dhl_delivery_rates
        WHERE price_kobo IS NOT NULL
        ORDER BY country_name, state_name
        LIMIT 10
      `;
      dhlSampleRates = rows.map((r) => ({
        country: String(r.country),
        state: String(r.state),
        price: Number(r.price),
      }));
    } catch {
      dhlSampleRates = [
        { country: "Nigeria", state: "Enugu", price: 2450000 },
        { country: "Nigeria", state: "Lagos", price: 2450000 },
        { country: "Nigeria", state: "Abuja", price: 2450000 },
        { country: "United Kingdom", state: "London", price: 6800000 },
        { country: "United States", state: "New York", price: 7200000 },
      ];
    }

    // 3. If user is logged in, fetch their recent request status from database
    let userRequestsContext = "";
    if (user?.id) {
      try {
        const userRecentRequests = await sql`
          SELECT id, campus, transcript_format AS "format", status, payment_status AS "paymentStatus",
                 matriculation_number AS "matricNumber", created_at AS "createdAt"
          FROM transcript_requests
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 3
        `;
        if (userRecentRequests.length > 0) {
          userRequestsContext = `User's logged requests in database: ${JSON.stringify(userRecentRequests)}`;
        }
      } catch {
        // user requests table might be empty or error handled safely
      }
    }

    // Build database knowledge summary
    const servicesList = activeTranscriptOptions
      .map((opt) => {
        const priceText = Number(opt.amount) === 0 && opt.requiresDhl
          ? "Calculated based on destination DHL courier rate"
          : `₦${Number(opt.amount).toLocaleString("en-NG")}`;
        return `• ${opt.label}: ${priceText} (${opt.category}${opt.requiresDhl ? ", requires DHL destination" : ""})`;
      })
      .join("\n");

    const sampleDhlText = dhlSampleRates
      .map((rate) => `• ${rate.country} (${rate.state}): ₦${(Number(rate.price) / 100).toLocaleString("en-NG")}`)
      .join("\n");

    const lower = message.toLowerCase();

    // Check specifically for: "i applied for my degree transcript and yet have not received it" or similar inquiries
    const isAppliedNotReceivedQuestion =
      (lower.includes("applied") || lower.includes("ordered") || lower.includes("requested") || lower.includes("paid")) &&
      (lower.includes("not received") || lower.includes("haven't received") || lower.includes("have not received") || lower.includes("yet to receive") || lower.includes("still waiting") || lower.includes("not seen") || lower.includes("not got") || lower.includes("not get") || lower.includes("delay"));

    // Check for general processing time questions
    const isProcessingTimeQuestion =
      !isAppliedNotReceivedQuestion &&
      (lower.includes("processing") || lower.includes("ready") || lower.includes("how long") || lower.includes("when will") || lower.includes("duration") || lower.includes("timeline") || lower.includes("sla")) &&
      (lower.includes("transcript") || lower.includes("english proficiency") || lower.includes("proficiency") || lower.includes("request") || lower.includes("document") || lower.includes("take") || lower.includes("get"));

    let directAnswer: string | null = null;

    if (isAppliedNotReceivedQuestion) {
      directAnswer =
        "Ooh! Sorry about that! It is not yet up to two weeks, but you will surely get it soon.\n\n" +
        "Standard degree transcript processing and verification at the university records office takes two weeks+ (14 to 21 working days) from when your payment was verified.\n\n" +
        "• If you opted for Official Softcopy: It will be electronically transmitted to your recipient institution or email as soon as processing completes.\n" +
        "• If you opted for Hardcopy delivery: DHL tracking details will be dispatched immediately to your phone and email once picked up from campus.\n\n" +
        "You can check your real-time status anytime under 'My Dashboard'. We are monitoring every batch closely!";
    } else if (isProcessingTimeQuestion) {
      directAnswer =
        "Processing of your academic transcript or English proficiency document is typically ready in two weeks+ (14 to 21 working days) from the date payment is confirmed and academic records are verified at your campus.\n\n" +
        "• Softcopy requests: Sent immediately upon completion to the recipient email and your inbox.\n" +
        "• Hardcopy requests: Handed to DHL courier for secure door-to-door delivery with live tracking.\n\n" +
        "You can track the progress anytime in your dashboard under 'Track Request' or 'My Dashboard'.";
    }

    // Save conversation in DB if conversationId is valid
    let conversationId = body.conversationId && isUuid(body.conversationId) ? body.conversationId : crypto.randomUUID();
    try {
      await sql`
        INSERT INTO assistant_conversations (id, user_id)
        VALUES (${conversationId}, ${user?.id ?? null})
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      `;
      await sql`
        INSERT INTO assistant_messages (conversation_id, role, content)
        VALUES (${conversationId}, 'user', ${message})
      `;
    } catch {
      // conversation tables error won't break the response
    }

    const apiKey = process.env.OPENAI_API_KEY;

    let finalAnswer = directAnswer;

    if (!finalAnswer && apiKey) {
      try {
        const history = (await getConversationMessages(conversationId)).reverse();
        const systemPrompt = `You are the TranscriptPoint Support Assistant. Answer accurately, courteously, and helpfully using exclusively verified data from our database:

Database Services & Official Fees:
${servicesList}

Sample Verified DHL Delivery Rates:
${sampleDhlText}

Processing Timeline Policy:
- Official processing of transcript or English proficiency requests is ready in two weeks+ (14 to 21 working days).
- Softcopy documents are transmitted directly to the recipient institution or applicant.
- Hardcopy documents are dispatched via DHL to the verified destination address once processed.

${userRequestsContext ? `Verified Active User Records:\n${userRequestsContext}` : ""}

Rules:
1. Always state that processing of transcripts or English proficiency takes two weeks+ (14-21 working days) when asked about completion, readiness, or timelines.
2. Only quote official prices from the database list above.
3. If the user wants to initiate a new request, direct them to click "Get Started" or visit "/request".
4. Be brief, professional, and clear.`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
            ],
          }),
        });

        if (aiResponse.ok) {
          const result = (await aiResponse.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          finalAnswer = result.choices?.[0]?.message?.content?.trim() || null;
        }
      } catch (err) {
        console.error("AI completion error, using database fallback", err);
      }
    }

    // Comprehensive database-backed rule engine fallback if AI service key is absent or unreachable
    if (!finalAnswer) {
      if (lower.includes("dhl") || lower.includes("courier") || lower.includes("shipping") || lower.includes("delivery cost") || lower.includes("delivery rate") || lower.includes("postage")) {
        finalAnswer = `Hardcopy transcript delivery is handled securely via DHL courier. Delivery rates are calculated based on your destination country and state:\n\n${sampleDhlText}\n\n• For destinations within Nigeria: Rates are mapped directly from our database.\n• For deliveries outside Nigeria: Rates correspond to DHL international zone tariffs. You can select your country and state directly in the DHL delivery popup modal on the request form.`;
      } else if (lower.includes("price") || lower.includes("cost") || lower.includes("how much") || lower.includes("fee") || lower.includes("amount") || lower.includes("services") || lower.includes("tariff") || lower.includes("rates")) {
        finalAnswer = `Here are the official fees and services configured in our database:\n\n${servicesList}\n\nYou can select any of these directly on the Request page (/request).`;
      } else if (lower.includes("track") || lower.includes("status") || lower.includes("check status") || lower.includes("progress") || lower.includes("where is my")) {
        if (userRequestsContext) {
          finalAnswer = `Here is your recent request information from our database:\n${userRequestsContext}\n\nYou can view your live processing status anytime under 'My Dashboard'.`;
        } else {
          finalAnswer = "You can track the live progress of your transcript or document request in your dashboard under 'Track Request' or 'My Dashboard'. If you submitted as a guest, your status updates and delivery tracking are also delivered directly to your email address.";
        }
      } else if (lower.includes("matric") || lower.includes("matriculation") || lower.includes("number format")) {
        finalAnswer = "For matriculation numbers:\n• Undergraduate format: 4-digit enrollment year followed by student serial digits, e.g. 2017/245323.\n• Postgraduate format: Starts with degree code, e.g. PG/M.SC/../...... or Ph.D/.../.....\n\nPlease ensure you enter it without spaces according to your study level.";
      } else if (lower.includes("english proficiency") || lower.includes("proficiency certificate") || lower.includes("language proficiency")) {
        finalAnswer = "TranscriptPoint provides verified English Proficiency Certificates issued by the academic records office:\n• Softcopy English Proficiency (Nigeria): ₦8,000\n• Softcopy Transcript + English Proficiency (Nigeria): ₦22,000\n• Softcopy Transcript + English Proficiency (Outside Nigeria): ₦34,000\n\nStandard processing timeline is two weeks+ (14 to 21 working days).";
      } else if (lower.includes("verification") || lower.includes("verify transcript") || lower.includes("verify certificate")) {
        finalAnswer = "We provide official verification services for third parties, employers, and academic institutions:\n• Transcript Verification: ₦12,000\n• Certificate Verification: ₦12,000\n\nYou can select either service on the Request page, submit the candidate details, and the clearinghouse will verify the credential against university archives.";
      } else if (lower.includes("payment") || lower.includes("pay") || lower.includes("paystack") || lower.includes("card") || lower.includes("bank transfer")) {
        finalAnswer = "Payment on TranscriptPoint is handled securely through Paystack:\n• Accepted payment methods: Debit/Credit cards (Mastercard, Visa, Verve), Bank Transfers, and USSD.\n• All fees are billed in Nigerian Naira (NGN).\n• If a payment attempt fails or is interrupted, you can resume your saved application anytime from your Dashboard or by reopening the payment page without re-entering your details.";
      } else if (lower.includes("campus") || lower.includes("campuses") || lower.includes("nsukka") || lower.includes("enugu")) {
        finalAnswer = "TranscriptPoint processes requests across University of Nigeria campuses and affiliated colleges, including:\n• Nsukka Campus\n• Enugu Campus\n• UNN Sandwich & UNN Diploma programs\n• Nwafor-Orizu College of Education, Nsugbe\n• Alvan Ikoku College of Education\n• Distance Learning & affiliate centers\n\nSelect your campus in the first section of the request form.";
      } else if (/\b(hello|hi|hey|good day|good morning|good afternoon|good evening)\b/i.test(lower)) {
        finalAnswer = "Hello! 👋 Welcome to TranscriptPoint Support Desk. How can we assist you with your transcript request, English proficiency document, DHL delivery, or payment today?";
      } else if (lower.includes("contact") || lower.includes("email") || lower.includes("desk") || lower.includes("phone number") || lower.includes("reach support")) {
        finalAnswer = "You can reach our dedicated records and support team at:\n• Email: support@transcriptpoint.com\n• Live Help Desk: Available 24/7 through this chat\n• Inquiries: Questions regarding document processing, DHL courier tracking, and verification.";
      } else if (lower.includes("how to apply") || lower.includes("how to request") || lower.includes("procedure") || lower.includes("steps") || lower.includes("new request")) {
        finalAnswer = "Applying for an official transcript or document is simple:\n1. Open the Transcript Request portal form on the home page or click 'New Request'.\n2. Fill in your Student Details (Campus, Mode of Admission, Level of Study, Matriculation Number, Document Type, Name, and Contact details).\n3. Enter the Recipient details and select delivery method (Official Softcopy via email or Hardcopy via DHL Courier).\n4. Submit and complete payment via Paystack.\n\nOnce completed, your application is queued immediately and ready in two weeks+.";
      } else {
        finalAnswer = `Welcome to TranscriptPoint Support! We provide end-to-end academic transcript processing, English proficiency certificates, and DHL delivery across all accredited campuses.\n\n` +
          `• Document Processing Timeline: Standard processing is ready in two weeks+ (14 to 21 working days).\n` +
          `• Services Available: Official Softcopy, Hardcopy via DHL, English Proficiency, and Verification.\n` +
          `• To start a request: Visit our New Request page (/request) or the request form modal on the home page.\n\n` +
          `Feel free to ask about specific fees, DHL shipping rates, tracking, or campus requirements. How may we assist you today?`;
      }
    }

    try {
      await sql`
        INSERT INTO assistant_messages (conversation_id, role, content)
        VALUES (${conversationId}, 'assistant', ${finalAnswer})
      `;
      await sql`
        UPDATE assistant_conversations SET updated_at = NOW() WHERE id = ${conversationId}
      `;
    } catch {
      // ignore
    }

    return NextResponse.json({ conversationId, answer: finalAnswer });
  } catch (error) {
    console.error("Unable to answer assistant message", error);
    return NextResponse.json({ error: "Unable to answer your question right now" }, { status: 500 });
  }
}