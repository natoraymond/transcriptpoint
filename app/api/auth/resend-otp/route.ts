import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import {
  checkSameOrigin,
  ensureAuthSchema,
  normalizeEmail,
  recordActivity,
} from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    await ensureAuthSchema();
    const sql = getDatabase();

    const [user] = await sql`
      SELECT id, full_name AS "fullName", email_verified_at AS "emailVerifiedAt"
      FROM portal_users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (!user) {
      return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ error: "This email address is already verified. You can sign in directly." }, { status: 400 });
    }

    // Rate limiting: check recent OTP request (throttle to at most 1 code per 60 seconds)
    const [recentOtp] = await sql`
      SELECT created_at AS "createdAt"
      FROM portal_email_otps
      WHERE email = ${email} AND created_at > NOW() - INTERVAL '60 seconds'
      LIMIT 1
    `;

    if (recentOtp) {
      return NextResponse.json(
        { error: "A verification code was recently sent. Please wait a minute before requesting another." },
        { status: 429 },
      );
    }

    // Generate new OTP
    const otpCode = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(otpCode).digest("hex");

    await sql`DELETE FROM portal_email_otps WHERE email = ${email}`;
    await sql`
      INSERT INTO portal_email_otps (email, otp_hash, user_id, expires_at)
      VALUES (${email}, ${otpHash}, ${user.id}, NOW() + INTERVAL '15 minutes')
    `;

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: `${otpCode} is your TranscriptPoint verification code`,
          text: `Hello ${user.fullName},\n\nYour new 6-digit verification code is:\n\n${otpCode}\n\nThis code will expire in 15 minutes. For your security, do not share this code with anyone.\n\nBest regards,\nTranscriptPoint Security`,
        });
      } catch (emailError) {
        console.error("Unable to send resend OTP email", emailError);
      }
    } else {
      console.log(`[DEVELOPMENT / LOCAL] Resent email OTP verification code for ${email}: ${otpCode}`);
    }

    await recordActivity(String(user.id), "otp_resend_requested", { email });

    return NextResponse.json({
      message: "A new 6-digit verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Unable to resend OTP", error);
    return NextResponse.json({ error: "Unable to resend code right now" }, { status: 500 });
  }
}

