import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  checkSameOrigin,
  createSession,
  ensureAuthSchema,
  normalizeEmail,
  publicUser,
  recordActivity,
} from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: unknown; otp?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Please enter a valid 6-digit verification code" }, { status: 400 });
    }

    await ensureAuthSchema();
    const sql = getDatabase();

    const otpHash = createHash("sha256").update(otp).digest("hex");

    // Retrieve active OTP record for this email
    const [otpRecord] = await sql`
      SELECT id, user_id AS "userId", otp_hash AS "otpHash", attempts, expires_at AS "expiresAt"
      FROM portal_email_otps
      WHERE email = ${email}
      ORDER BY expires_at DESC
      LIMIT 1
    `;

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No verification code was found for this email. Please request a new code." },
        { status: 400 },
      );
    }

    if (new Date(String(otpRecord.expiresAt)).getTime() <= Date.now()) {
      await sql`DELETE FROM portal_email_otps WHERE email = ${email}`;
      return NextResponse.json(
        { error: "This verification code has expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (Number(otpRecord.attempts) >= 5) {
      await sql`DELETE FROM portal_email_otps WHERE email = ${email}`;
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new verification code." },
        { status: 429 },
      );
    }

    // Check OTP match
    if (otpRecord.otpHash !== otpHash) {
      await sql`
        UPDATE portal_email_otps
        SET attempts = attempts + 1
        WHERE id = ${otpRecord.id}
      `;
      return NextResponse.json(
        { error: "Incorrect verification code. Please check your email and try again." },
        { status: 400 },
      );
    }

    // Verified! Invalidate the OTP
    await sql`DELETE FROM portal_email_otps WHERE email = ${email}`;

    // Mark user as email verified
    const [user] = await sql`
      UPDATE portal_users
      SET email_verified_at = NOW(), updated_at = NOW()
      WHERE id = ${otpRecord.userId} AND is_active = TRUE
      RETURNING id, email, full_name AS "fullName", phone_number AS "phoneNumber", role, permissions, is_active AS "isActive"
    `;

    if (!user) {
      return NextResponse.json({ error: "Unable to find or activate account" }, { status: 400 });
    }

    // Create session and log user in
    await createSession(String(user.id));
    await recordActivity(String(user.id), "email_otp_verified", { email });

    // Send confirmation email if Resend is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: "Your TranscriptPoint account is now verified",
          text: `Hello ${user.fullName},\n\nYour email address has been successfully verified, and your TranscriptPoint account is now active.\n\nBest regards,\nTranscriptPoint Security`,
        });
      } catch (emailError) {
        console.error("Unable to send verified confirmation email", emailError);
      }
    }

    const permissions = Array.isArray(user.permissions)
      ? user.permissions
      : typeof user.permissions === "string"
      ? JSON.parse(user.permissions)
      : [];

    return NextResponse.json({
      message: "Email successfully verified! You are now logged in.",
      user: publicUser({
        id: String(user.id),
        email: String(user.email),
        fullName: String(user.fullName),
        phoneNumber: String(user.phoneNumber ?? ""),
        role: user.role,
        permissions,
        isActive: true,
      }),
    });
  } catch (error) {
    console.error("Unable to verify OTP", error);
    return NextResponse.json({ error: "Unable to verify code right now" }, { status: 500 });
  }
}

