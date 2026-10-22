import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { checkSameOrigin, ensureAuthSchema, hashPassword, recordActivity } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json({ error: "Invalid or expired password reset token" }, { status: 400 });
    }

    if (!password || password.length < 9 || password.length > 200) {
      return NextResponse.json({ error: "Password must be at least 9 characters long" }, { status: 400 });
    }

    await ensureAuthSchema();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const sql = getDatabase();

    const [resetRecord] = await sql`
      SELECT tokens.token_hash, tokens.user_id AS "userId", users.email, users.full_name AS "fullName"
      FROM portal_password_reset_tokens tokens
      JOIN portal_users users ON users.id = tokens.user_id
      WHERE tokens.token_hash = ${tokenHash}
        AND tokens.expires_at > NOW()
        AND users.is_active = TRUE
      LIMIT 1
    `;

    if (!resetRecord) {
      return NextResponse.json({ error: "This password reset link is invalid or has expired. Please request a new one." }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(password);

    // Update password and ensure email is verified
    await sql`
      UPDATE portal_users
      SET password_hash = ${newPasswordHash},
          email_verified_at = COALESCE(email_verified_at, NOW()),
          updated_at = NOW()
      WHERE id = ${resetRecord.userId}
    `;

    // Terminate all old sessions for security
    await sql`DELETE FROM portal_sessions WHERE user_id = ${resetRecord.userId}`;

    // Delete used reset token
    await sql`DELETE FROM portal_password_reset_tokens WHERE token_hash = ${tokenHash}`;

    await recordActivity(String(resetRecord.userId), "password_reset_completed");

    // Send confirmation email
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: emailFrom,
          to: String(resetRecord.email),
          subject: "Your TranscriptPoint password has been reset",
          text: `Hello ${resetRecord.fullName},\n\nYour TranscriptPoint account password was successfully reset. You can now sign in with your new password.\n\nIf you did not perform this action, please contact support immediately.\n\nBest regards,\nTranscriptPoint Security`,
        });
      } catch (emailError) {
        console.error("Unable to send password reset confirmation email", emailError);
      }
    }

    return NextResponse.json({
      message: "Your password has been successfully reset. You can now sign in.",
    });
  } catch (error) {
    console.error("Unable to reset password", error);
    return NextResponse.json({ error: "Unable to reset password right now" }, { status: 500 });
  }
}
