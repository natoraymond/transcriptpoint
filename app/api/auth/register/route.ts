import { NextResponse } from "next/server";
import { createHash, randomInt } from "node:crypto";
import {
  checkSameOrigin,
  ensureAuthSchema,
  hashPassword,
  normalizeEmail,
  recordActivity,
} from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultAdminPermissions = [
  "dashboard.read",
  "requests.read",
  "requests.update",
  "payments.read",
  "users.read",
  "users.update",
] as const;

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown; fullName?: unknown; role?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const requestedRole = typeof body.role === "string" ? body.role.toLowerCase().trim() : "user";
    const wantsAdmin = requestedRole === "admin";
    const configuredMaxAccounts = Number(process.env.MAX_PORTAL_ACCOUNTS ?? 10000);

    if (
      !emailPattern.test(email) ||
      email.length > 254 ||
      !fullName ||
      fullName.length > 120 ||
      password.length < 9 ||
      password.length > 200 ||
      !Number.isInteger(configuredMaxAccounts) ||
      configuredMaxAccounts < 1
    ) {
      return NextResponse.json(
        { error: "Enter a valid email and name, and a password of at least 9 characters" },
        { status: 400 },
      );
    }

    await ensureAuthSchema();
    const sql = getDatabase();

    // Ensure portal_settings table and initial row exist
    await sql`
      INSERT INTO portal_settings (id, initial_super_admin_created_at)
      VALUES (TRUE, NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `;

    // Check account count against capacity cap
    const [countRow] = await sql`
      SELECT COUNT(*)::int AS "accountCount",
             COUNT(*) FILTER (WHERE role = 'super_admin' AND is_active = TRUE)::int AS "activeSuperAdminCount"
      FROM portal_users
    `;

    if (Number(countRow?.accountCount ?? 0) >= configuredMaxAccounts) {
      return NextResponse.json(
        { error: "Account registration is temporarily full. Please contact support." },
        { status: 503 },
      );
    }

    // Check if account already exists
    const [existingUser] = await sql`
      SELECT id, email_verified_at AS "emailVerifiedAt"
      FROM portal_users
      WHERE email = ${email}
      LIMIT 1
    `;

    let userId: string;

    if (existingUser) {
      // If the email is already verified, reject registration
      if (existingUser.emailVerifiedAt) {
        return NextResponse.json({ error: "An account with this email address already exists" }, { status: 409 });
      }
      // If user registered earlier but never verified OTP, update password/name and resend OTP
      userId = String(existingUser.id);
      const passwordHash = await hashPassword(password);
      await sql`
        UPDATE portal_users
        SET password_hash = ${passwordHash}, full_name = ${fullName}, updated_at = NOW()
        WHERE id = ${userId}
      `;
    } else {
      // If registering as admin and no super_admin exists yet, grant super_admin privilege
      const isFirstAdmin = Number(countRow?.activeSuperAdminCount ?? 0) === 0 && wantsAdmin;
      const finalRole: "super_admin" | "admin" | "user" = isFirstAdmin ? "super_admin" : wantsAdmin ? "admin" : "user";

      const passwordHash = await hashPassword(password);
      const isElevatedRole = finalRole === "admin" || finalRole === "super_admin";
      const permissions = isElevatedRole ? [...defaultAdminPermissions] : [];

      // Require email OTP verification: email_verified_at is NULL initially
      const [user] = await sql`
        INSERT INTO portal_users (email, password_hash, full_name, role, permissions, is_active, email_verified_at)
        VALUES (
          ${email},
          ${passwordHash},
          ${fullName},
          ${finalRole},
          ${JSON.stringify(permissions)}::jsonb,
          TRUE,
          NULL
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;

      if (!user) {
        return NextResponse.json({ error: "An account with this email address already exists" }, { status: 409 });
      }
      userId = String(user.id);

      if (isFirstAdmin) {
        await sql`
          UPDATE portal_settings
          SET initial_super_admin_created_at = NOW(), updated_at = NOW()
          WHERE id = TRUE
        `;
      }
    }

    // Generate a secure 6-digit OTP code (100000 - 999999)
    const otpCode = randomInt(100000, 1000000).toString();
    const otpHash = createHash("sha256").update(otpCode).digest("hex");

    // Invalidate prior active OTPs for this email and insert new one with 15-minute expiry
    await sql`DELETE FROM portal_email_otps WHERE email = ${email}`;
    await sql`
      INSERT INTO portal_email_otps (email, otp_hash, user_id, expires_at)
      VALUES (${email}, ${otpHash}, ${userId}, NOW() + INTERVAL '15 minutes')
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
          text: `Hello ${fullName},\n\nYour 6-digit verification code to confirm ownership of your email address is:\n\n${otpCode}\n\nThis code will expire in 15 minutes. For your security, do not share this code with anyone.\n\nBest regards,\nTranscriptPoint Security`,
        });
      } catch (emailError) {
        console.error("Unable to send OTP verification email", emailError);
      }
    } else {
      console.log(`[DEVELOPMENT / LOCAL] Email OTP verification code for ${email}: ${otpCode}`);
    }

    await recordActivity(userId, "otp_requested", { email });

    return NextResponse.json(
      {
        message: "A 6-digit verification code has been sent to your email. Enter it below to complete registration.",
        requiresOtp: true,
        email,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unable to register portal user", error);
    return NextResponse.json({ error: "Unable to create your account right now" }, { status: 500 });
  }
}
