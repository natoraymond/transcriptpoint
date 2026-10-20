import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { adminPermissions, checkSameOrigin, hashPassword, normalizeEmail, recordActivity, requireSuperAdmin } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";
import { Resend } from "resend";

const validRoles = new Set(["user", "admin", "super_admin"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const access = await requireSuperAdmin();
  if (!access.user) return access.response;
  try {
    const sql = getDatabase();
    const users = await sql`
      SELECT id, email, full_name AS "fullName", phone_number AS "phoneNumber",
        role, permissions, is_active AS "isActive", created_at AS "createdAt",
        (SELECT MAX(created_at) FROM portal_activity activity WHERE activity.user_id = portal_users.id) AS "lastActivityAt"
      FROM portal_users ORDER BY created_at DESC LIMIT 500
    `;
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load portal user management data", error);
    return NextResponse.json({ error: "Unable to load user management data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireSuperAdmin();
  if (!access.user) return access.response;

  try {
    const body = (await request.json()) as { email?: unknown; fullName?: unknown; password?: unknown; role?: unknown; permissions?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role : "user";
    const permissions = Array.isArray(body.permissions) ? body.permissions.filter((item): item is typeof adminPermissions[number] => adminPermissions.includes(item as typeof adminPermissions[number])) : [];
    if (!emailPattern.test(email) || email.length > 254 || !fullName || fullName.length > 120 || password || !validRoles.has(role)) {
      return NextResponse.json({ error: "Provide a valid email, name, and role. Accounts must be activated through email invitation." }, { status: 400 });
    }
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const appUrlValue = process.env.APP_URL;
    let invitationOrigin: URL | null = null;
    try {
      if (appUrlValue) invitationOrigin = new URL(appUrlValue);
    } catch {
      invitationOrigin = null;
    }
    const isAllowedInvitationOrigin = invitationOrigin?.protocol === "https:" || (process.env.NODE_ENV === "development" && invitationOrigin?.protocol === "http:" && ["localhost", "127.0.0.1"].includes(invitationOrigin.hostname));
    if (!resendApiKey || !emailFrom || !isAllowedInvitationOrigin) {
      return NextResponse.json({ error: "Email invitation is not configured. Set APP_URL, RESEND_API_KEY, and EMAIL_FROM." }, { status: 503 });
    }
    const temporaryPassword = randomBytes(32).toString("base64url");
    const sql = getDatabase();
    const passwordHash = await hashPassword(temporaryPassword);
    const [created] = await sql`
      INSERT INTO portal_users (email, full_name, password_hash, role, permissions)
      VALUES (${email}, ${fullName}, ${passwordHash}, ${role}, ${JSON.stringify(permissions)}::jsonb)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, full_name AS "fullName", role
    `;
    if (!created) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    await recordActivity(access.user.id, "user_created", { targetUserId: String(created.id), role });
    {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await sql`INSERT INTO portal_email_verification_tokens (token_hash, user_id, purpose, expires_at) VALUES (${tokenHash}, ${created.id}, 'setup', NOW() + INTERVAL '48 hours')`;
      const setupUrl = new URL(`/verify-email?token=${rawToken}`, invitationOrigin!.origin).toString();
      try {
        const resend = new Resend(resendApiKey!);
        const { error: emailError } = await resend.emails.send({ from: emailFrom!, to: email, subject: "Set up your TranscriptPoint account", text: `Hello ${fullName}, a Super Admin created a TranscriptPoint ${role.replace("_", " ")} account for you. Use this one-time link within 48 hours to verify your email and set your password: ${setupUrl}` });
        if (emailError) throw emailError;
      } catch (emailError) {
        console.error("Unable to send new account invitation", emailError);
        await sql`DELETE FROM portal_users WHERE id = ${created.id}`;
        return NextResponse.json({ error: "Unable to send account setup email" }, { status: 502 });
      }
    }
    return NextResponse.json({ user: { ...created, invited: true } }, { status: 201 });
  } catch (error) {
    console.error("Unable to create portal account", error);
    return NextResponse.json({ error: "Unable to create account" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireSuperAdmin();
  if (!access.user) return access.response;

  try {
    const body = (await request.json()) as { userId?: unknown; role?: unknown; permissions?: unknown; isActive?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!/^[0-9a-f-]{36}$/i.test(userId) || (body.role !== undefined && (typeof body.role !== "string" || !validRoles.has(body.role)))) {
      return NextResponse.json({ error: "Provide a valid user and role" }, { status: 400 });
    }
    const sql = getDatabase();
    const [target] = await sql`SELECT role FROM portal_users WHERE id = ${userId} LIMIT 1`;
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "super_admin" && (body.role !== undefined || body.isActive !== undefined)) {
      return NextResponse.json({ error: "Super Admin role and active access are protected. Create another Super Admin before making privileged-account changes." }, { status: 409 });
    }
    if (userId === access.user.id && (body.role !== undefined && body.role !== "super_admin" || body.isActive === false)) {
      return NextResponse.json({ error: "You cannot remove your own Super Admin access" }, { status: 400 });
    }
    if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Account status must be active or suspended" }, { status: 400 });
    }
    if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
      return NextResponse.json({ error: "Permissions must be a list" }, { status: 400 });
    }
    const permissions = Array.isArray(body.permissions)
      ? [...new Set(body.permissions.filter((item): item is typeof adminPermissions[number] => adminPermissions.includes(item as typeof adminPermissions[number])))]
      : null;
    const [updated] = await sql`
      UPDATE portal_users SET
        role = COALESCE(${body.role ?? null}, role),
        permissions = CASE
          WHEN COALESCE(${body.role ?? null}, role) <> 'admin' THEN '[]'::jsonb
          ELSE COALESCE(${permissions ? JSON.stringify(permissions) : null}::jsonb, permissions)
        END,
        is_active = COALESCE(${body.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${userId} AND role <> 'super_admin'
      RETURNING id, email, full_name AS "fullName", role, permissions, is_active AS "isActive"
    `;
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (body.isActive === false) await sql`DELETE FROM portal_sessions WHERE user_id = ${userId}`;
    await recordActivity(access.user.id, "user_access_updated", { targetUserId: userId, role: updated.role, isActive: updated.isActive, permissions: updated.permissions });
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Unable to update portal user access", error);
    return NextResponse.json({ error: "Unable to update user access" }, { status: 500 });
  }
}
