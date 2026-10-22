import { createHash, randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { checkSameOrigin, createSession, normalizeEmail, publicUser, recordActivity, verifyPassword } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

const scrypt = promisify(scryptCallback);
let dummyPasswordHash: string | undefined;

async function getDummyPasswordHash() {
  if (!dummyPasswordHash) {
    const salt = randomBytes(16).toString("hex");
    const hash = await scrypt(randomBytes(32), salt, 64) as Buffer;
    dummyPasswordHash = `scrypt:${salt}:${hash.toString("hex")}`;
  }
  return dummyPasswordHash;
}

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || email.length > 254 || !password || password.length > 200) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const sql = getDatabase();
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const attemptKey = createHash("sha256").update(`${email}:${forwardedFor}`).digest("hex");
    const [attempt] = await sql`SELECT blocked_until AS "blockedUntil" FROM portal_login_attempts WHERE attempt_key = ${attemptKey}`;
    if (attempt?.blockedUntil && new Date(String(attempt.blockedUntil)).getTime() > Date.now()) {
      return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429 });
    }
    const [row] = await sql`
      SELECT id, email, password_hash AS "passwordHash", full_name AS "fullName",
        phone_number AS "phoneNumber", role, permissions,
        is_active AS "isActive", email_verified_at AS "emailVerifiedAt"
      FROM portal_users WHERE email = ${email} LIMIT 1
    `;
    const validPassword = await verifyPassword(password, row ? String(row.passwordHash) : await getDummyPasswordHash());
    if (!row || !row.isActive || !validPassword) {
      const [updatedAttempt] = await sql`
        INSERT INTO portal_login_attempts (attempt_key, attempts, window_started_at, blocked_until)
        VALUES (${attemptKey}, 1, NOW(), NULL)
        ON CONFLICT (attempt_key) DO UPDATE SET
          attempts = CASE WHEN portal_login_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1 ELSE portal_login_attempts.attempts + 1 END,
          window_started_at = CASE WHEN portal_login_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE portal_login_attempts.window_started_at END,
          blocked_until = CASE
            WHEN portal_login_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN NULL
            WHEN portal_login_attempts.attempts + 1 >= 8 THEN NOW() + INTERVAL '15 minutes'
            ELSE portal_login_attempts.blocked_until
          END
        RETURNING attempts
      `;
      if (Number(updatedAttempt?.attempts ?? 0) >= 5) {
        return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429 });
      }
      return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
    }

    if (!row.emailVerifiedAt) {
      // Auto-verify administrators and users when Resend email service is not configured
      if (row.role === "admin" || row.role === "super_admin" || !process.env.RESEND_API_KEY) {
        await sql`UPDATE portal_users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = ${row.id}`;
      } else {
        return NextResponse.json({ error: "Verify your email address using the link we sent before signing in" }, { status: 403 });
      }
    }

    await sql`DELETE FROM portal_login_attempts WHERE attempt_key = ${attemptKey}`;
    await createSession(String(row.id));
    await recordActivity(String(row.id), "login");
    let signInNotificationSent = false;
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        const { error: notificationError } = await resend.emails.send({
          from: emailFrom,
          to: String(row.email),
          subject: "New sign-in to your TranscriptPoint account",
          text: `Hello ${row.fullName}, a successful sign-in to your TranscriptPoint account occurred on ${new Date().toUTCString()}. If this was not you, change your password and contact support.`,
        });
        if (notificationError) console.error("Unable to send successful sign-in notification", notificationError);
        else signInNotificationSent = true;
      } catch (notificationError) {
        console.error("Unable to send successful sign-in notification", notificationError);
      }
    }
    const permissions = Array.isArray(row.permissions) ? row.permissions : [];
    return NextResponse.json({
      signInNotificationSent,
      user: publicUser({
        id: String(row.id), email: String(row.email), fullName: String(row.fullName),
        phoneNumber: String(row.phoneNumber ?? ""), role: row.role, permissions,
        isActive: Boolean(row.isActive),
      }),
    });
  } catch (error) {
    console.error("Unable to sign in portal user", error);
    return NextResponse.json({ error: "Unable to complete sign-in right now" }, { status: 500 });
  }
}
