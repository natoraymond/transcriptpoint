import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import {
  adminPermissions,
  checkSameOrigin,
  createSession,
  ensureAuthSchema,
  hashPassword,
  normalizeEmail,
  publicUser,
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

    // If registering as admin and no super_admin exists yet, grant super_admin privilege
    const isFirstAdmin = Number(countRow?.activeSuperAdminCount ?? 0) === 0 && wantsAdmin;
    const finalRole: "super_admin" | "admin" | "user" = isFirstAdmin ? "super_admin" : wantsAdmin ? "admin" : "user";

    const passwordHash = await hashPassword(password);
    const isElevatedRole = finalRole === "admin" || finalRole === "super_admin";
    const permissions = isElevatedRole ? [...defaultAdminPermissions] : [];

    const [user] = await sql`
      INSERT INTO portal_users (email, password_hash, full_name, role, permissions, is_active, email_verified_at)
      VALUES (
        ${email},
        ${passwordHash},
        ${fullName},
        ${finalRole},
        ${JSON.stringify(permissions)}::jsonb,
        TRUE,
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, full_name AS "fullName", role, permissions, is_active AS "isActive", email_verified_at AS "emailVerifiedAt"
    `;

    if (!user) {
      return NextResponse.json({ error: "An account with this email address already exists" }, { status: 409 });
    }

    // Update portal_settings bootstrap timestamp
    if (isFirstAdmin) {
      await sql`
        UPDATE portal_settings
        SET initial_super_admin_created_at = NOW(), updated_at = NOW()
        WHERE id = TRUE
      `;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const appUrlValue = process.env.APP_URL || "http://localhost:3000";

    // Immediate active login and session for administrators
    if (isElevatedRole) {
      await createSession(String(user.id));
      await recordActivity(String(user.id), "admin_account_created", { role: finalRole });

      if (resendApiKey && emailFrom) {
        try {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: emailFrom,
            to: email,
            subject: `Welcome to TranscriptPoint - ${finalRole === "super_admin" ? "Super Admin" : "Administrator"} Account Activated`,
            text: `Hello ${fullName},\n\nYour TranscriptPoint Administrator account (${email}) has been successfully created and activated.\n\nYou can access your dashboard anytime at: ${appUrlValue}/admin\n\nBest regards,\nTranscriptPoint Administration`,
          });
        } catch (emailError) {
          console.error("Unable to send admin welcome email", emailError);
        }
      }

      return NextResponse.json(
        {
          message: `${finalRole === "super_admin" ? "Super Admin" : "Administrator"} account created successfully! You are now logged in.`,
          user: publicUser({
            id: String(user.id),
            email: String(user.email),
            fullName: String(user.fullName),
            phoneNumber: "",
            role: finalRole,
            permissions: [...defaultAdminPermissions],
            isActive: true,
          }),
        },
        { status: 201 },
      );
    }

    // Standard user flow: auto-activate and login immediately
    await createSession(String(user.id));
    await recordActivity(String(user.id), "account_created", { role: "user" });

    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: "Welcome to TranscriptPoint",
          text: `Hello ${fullName},\n\nYour TranscriptPoint account has been successfully created.\n\nSign in anytime at: ${appUrlValue}/sign-in\n\nBest regards,\nTranscriptPoint Team`,
        });
      } catch (emailError) {
        console.error("Unable to send user welcome email", emailError);
      }
    }

    return NextResponse.json(
      {
        message: "Account created successfully! You are now signed in.",
        user: publicUser({
          id: String(user.id),
          email: String(user.email),
          fullName: String(user.fullName),
          phoneNumber: "",
          role: "user",
          permissions: [],
          isActive: true,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to register portal user", error);
    return NextResponse.json({ error: "Unable to create your account right now" }, { status: 500 });
  }
}
