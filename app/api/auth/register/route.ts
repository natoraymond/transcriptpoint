import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { checkSameOrigin, createSession, hashPassword, normalizeEmail, recordActivity } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown; fullName?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const configuredMaxAccounts = Number(process.env.MAX_PORTAL_ACCOUNTS ?? 10000);
    if (!emailPattern.test(email) || email.length > 254 || !fullName || fullName.length > 120 || password.length < 9 || password.length > 200 || !Number.isInteger(configuredMaxAccounts) || configuredMaxAccounts < 1) {
      return NextResponse.json({ error: "Enter a valid email and name, and a password of at least 9 characters" }, { status: 400 });
    }

    const sql = getDatabase();
    const [bootstrapState] = await sql`
      SELECT settings.initial_super_admin_created_at AS "bootstrapClaimedAt",
        COUNT(users.id)::int AS "accountCount"
      FROM portal_settings settings LEFT JOIN portal_users users ON TRUE
      WHERE settings.id = TRUE
      GROUP BY settings.initial_super_admin_created_at
    `;
    if (!bootstrapState?.bootstrapClaimedAt || Number(bootstrapState.accountCount) === 0) {
      return NextResponse.json({ error: "Account registration is not yet available. Please contact the site administrator." }, { status: 503 });
    }
    if (Number(bootstrapState.accountCount) >= configuredMaxAccounts) {
      return NextResponse.json({ error: "Account registration is temporarily full. Please contact support." }, { status: 503 });
    }
    const passwordHash = await hashPassword(password);
    const [user] = await sql`
      INSERT INTO portal_users (email, password_hash, full_name, role)
      VALUES (${email}, ${passwordHash}, ${fullName}, 'user')
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (!user) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const appUrlValue = process.env.APP_URL;
    let appUrl: URL;
    try {
      appUrl = new URL(appUrlValue ?? "");
    } catch {
      appUrl = new URL("http://invalid.local");
    }
    const allowedDevelopmentOrigin = process.env.NODE_ENV === "development" && appUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(appUrl.hostname);
    if (!resendApiKey || !emailFrom || !appUrlValue || (appUrl.protocol !== "https:" && !allowedDevelopmentOrigin)) {
      if (process.env.NODE_ENV === "development") {
        const [activatedUser] = await sql`
          UPDATE portal_users SET email_verified_at = NOW(), updated_at = NOW()
          WHERE id = ${user.id}
          RETURNING id
        `;
        await createSession(String(activatedUser.id));
        await recordActivity(String(activatedUser.id), "account_created_development");
        return NextResponse.json({ message: "Local development account created. You can now sign in." }, { status: 201 });
      }
      await sql`DELETE FROM portal_users WHERE id = ${user.id}`;
      return NextResponse.json({ error: "Email verification is not configured. Please contact support." }, { status: 503 });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await sql`INSERT INTO portal_email_verification_tokens (token_hash, user_id, purpose, expires_at) VALUES (${tokenHash}, ${user.id}, 'verify', NOW() + INTERVAL '24 hours')`;
    const verificationUrl = new URL(`/verify-email?token=${rawToken}`, appUrl.origin).toString();
    try {
      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: "Verify your TranscriptPoint account",
        text: `Hello ${fullName}, verify your email address within 24 hours to activate your TranscriptPoint account: ${verificationUrl}`,
      });
      if (emailError) throw emailError;
    } catch (emailError) {
      console.error("Unable to send account verification email", emailError);
      await sql`DELETE FROM portal_users WHERE id = ${user.id}`;
      return NextResponse.json({ error: "Unable to send verification email. Please try again later." }, { status: 502 });
    }

    return NextResponse.json({
      message: "Account created. Check your email for a verification link before signing in.",
    }, { status: 201 });
  } catch (error) {
    console.error("Unable to register portal user", error);
    return NextResponse.json({ error: "Unable to create your account right now" }, { status: 500 });
  }
}
