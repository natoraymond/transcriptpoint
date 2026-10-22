import { NextResponse } from "next/server";
import {
  adminPermissions,
  checkSameOrigin,
  hashPassword,
  normalizeEmail,
  recordActivity,
  requirePermission,
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

export async function GET() {
  const access = await requirePermission("users.read");
  if (!access.user) return access.response;
  try {
    const sql = getDatabase();
    const users = await sql`
      SELECT id, email, full_name AS "fullName", phone_number AS "phoneNumber",
        role, permissions, is_active AS "isActive", avatar_url AS "avatarUrl", created_at AS "createdAt"
      FROM portal_users ORDER BY created_at DESC LIMIT 500
    `;
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load users for administrator", error);
    return NextResponse.json({ error: "Unable to load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requirePermission("users.update");
  if (!access.user) return access.response;

  try {
    const body = (await request.json()) as {
      email?: unknown;
      fullName?: unknown;
      password?: unknown;
      role?: unknown;
      permissions?: unknown;
    };

    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" && body.role.toLowerCase() === "admin" ? "admin" : "user";

    if (!emailPattern.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    if (!fullName || fullName.length > 120) {
      return NextResponse.json({ error: "Please enter a name between 1 and 120 characters" }, { status: 400 });
    }
    if (!password || password.length < 9 || password.length > 200) {
      return NextResponse.json({ error: "Password must be at least 9 characters" }, { status: 400 });
    }

    const assignedPermissions =
      role === "admin"
        ? Array.isArray(body.permissions) && body.permissions.length > 0
          ? body.permissions.filter((p): p is typeof adminPermissions[number] =>
              adminPermissions.includes(p as typeof adminPermissions[number]),
            )
          : [...defaultAdminPermissions]
        : [];

    const passwordHash = await hashPassword(password);
    const sql = getDatabase();

    const [created] = await sql`
      INSERT INTO portal_users (
        email,
        password_hash,
        full_name,
        role,
        permissions,
        is_active,
        email_verified_at
      )
      VALUES (
        ${email},
        ${passwordHash},
        ${fullName},
        ${role},
        ${JSON.stringify(assignedPermissions)}::jsonb,
        TRUE,
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, full_name AS "fullName", role, permissions, is_active AS "isActive", created_at AS "createdAt"
    `;

    if (!created) {
      return NextResponse.json({ error: "An account with this email address already exists" }, { status: 409 });
    }

    await recordActivity(access.user.id, "admin_created_account", {
      targetUserId: String(created.id),
      role,
      email,
    });

    // Send email notification to user upon account creation
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    if (resendApiKey && emailFrom) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: `Your TranscriptPoint ${role === "admin" ? "Administrator" : "User"} Account Was Created`,
          text: `Hello ${fullName},\n\nAn administrator has created a TranscriptPoint ${role === "admin" ? "Administrator" : "User"} account for you.\n\nYou can sign in using your email address (${email}) at: ${appUrl}/sign-in\n\nBest regards,\nTranscriptPoint Administration`,
        });
      } catch (emailError) {
        console.error("Unable to send account creation notification email", emailError);
      }
    }

    return NextResponse.json(
      {
        message: `${role === "admin" ? "Admin" : "User"} account created successfully with immediate sign-in access.`,
        user: created,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create account from admin portal", error);
    return NextResponse.json({ error: "Unable to create account right now" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requirePermission("users.update");
  if (!access.user) return access.response;
  try {
    const body = (await request.json()) as { userId?: unknown; isActive?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!/^[0-9a-f-]{36}$/i.test(userId) || typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Provide a valid user and active status" }, { status: 400 });
    }
    const sql = getDatabase();
    const [updated] = await sql`
      UPDATE portal_users SET is_active = ${body.isActive}, updated_at = NOW()
      WHERE id = ${userId} AND role <> 'super_admin'
      RETURNING id, email, is_active AS "isActive"
    `;
    if (!updated) return NextResponse.json({ error: "User account not found or not manageable" }, { status: 404 });
    if (!body.isActive) await sql`DELETE FROM portal_sessions WHERE user_id = ${userId}`;
    await recordActivity(access.user.id, "user_account_status_updated", {
      targetUserId: userId,
      isActive: body.isActive,
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Unable to update user account status", error);
    return NextResponse.json({ error: "Unable to update user account" }, { status: 500 });
  }
}
