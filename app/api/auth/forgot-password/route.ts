import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { checkSameOrigin, ensureAuthSchema, normalizeEmail, recordActivity } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!emailPattern.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    await ensureAuthSchema();
    const sql = getDatabase();
    const [user] = await sql`
      SELECT id, email, full_name AS "fullName", is_active AS "isActive"
      FROM portal_users
      WHERE email = ${email}
      LIMIT 1
    `;

    // Standard security practice: always return a neutral success message
    const neutralResponse = {
      message: "If an account matches that email address, a password reset link has been sent.",
    };

    if (!user || !user.isActive) {
      return NextResponse.json(neutralResponse);
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    // Clean up any old reset tokens for this user
    await sql`DELETE FROM portal_password_reset_tokens WHERE user_id = ${user.id}`;
    // Insert new reset token valid for 1 hour
    await sql`
      INSERT INTO portal_password_reset_tokens (token_hash, user_id, expires_at)
      VALUES (${tokenHash}, ${user.id}, NOW() + INTERVAL '1 hour')
    `;

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: "Reset your TranscriptPoint password",
          text: `Hello ${user.fullName},\n\nWe received a request to reset the password for your TranscriptPoint account.\n\nClick the link below within 1 hour to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email; your account remains secure.\n\nBest regards,\nTranscriptPoint Security`,
        });
      } catch (emailError) {
        console.error("Unable to send password reset email", emailError);
      }
    } else {
      console.log(`[DEVELOPMENT / LOCAL] Password reset link for ${email}: ${resetUrl}`);
    }

    await recordActivity(String(user.id), "password_reset_requested");

    return NextResponse.json(neutralResponse);
  } catch (error) {
    console.error("Unable to process password reset request", error);
    return NextResponse.json({ error: "Unable to process password reset right now" }, { status: 500 });
  }
}
