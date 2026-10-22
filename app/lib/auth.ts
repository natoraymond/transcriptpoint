import "server-only";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDatabase } from "./db";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "transcriptpoint_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

export const adminPermissions = [
  "dashboard.read",
  "requests.read",
  "requests.update",
  "payments.read",
  "users.read",
  "users.update",
] as const;
export type AdminPermission = (typeof adminPermissions)[number];
export type UserRole = "user" | "admin" | "super_admin";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  permissions: AdminPermission[];
  isActive: boolean;
  avatarUrl?: string | null;
};

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  permissions: AdminPermission[] | string;
  isActive: boolean;
  avatarUrl?: string | null;
};

let schemaEnsured = false;
export async function ensureAuthSchema() {
  if (schemaEnsured) return;
  try {
    const sql = getDatabase();
    await sql`ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
    await sql`
      CREATE TABLE IF NOT EXISTS portal_password_reset_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    schemaEnsured = true;
  } catch (err) {
    console.error("Schema ensure warning:", err);
  }
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expectedHex] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !/^[a-f0-9]{128}$/i.test(expectedHex ?? "")) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}

export function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parsePermissions(value: UserRow["permissions"]): AdminPermission[] {
  let permissions: unknown = value;
  if (typeof value === "string") {
    try {
      permissions = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((permission): permission is AdminPermission =>
    adminPermissions.includes(permission as AdminPermission),
  );
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    ...row,
    permissions: parsePermissions(row.permissions),
    avatarUrl: row.avatarUrl ?? null,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;

  await ensureAuthSchema();
  const sql = getDatabase();
  const [row] = await sql`
    SELECT users.id, users.email, users.full_name AS "fullName",
      users.phone_number AS "phoneNumber", users.role, users.permissions,
      users.is_active AS "isActive", users.avatar_url AS "avatarUrl"
    FROM portal_sessions sessions
    JOIN portal_users users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${digestToken(token)}
      AND sessions.expires_at > NOW()
      AND users.is_active = TRUE
    LIMIT 1
  `;
  return row ? toAuthUser(row as UserRow) : null;
}

export function userHasPermission(user: AuthUser, permission: AdminPermission) {
  return user.role === "super_admin" || (user.role === "admin" && user.permissions.includes(permission));
}

export function roleDashboardPath(role: UserRole) {
  if (role === "super_admin") return "/super-admin";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
    permissions: user.permissions,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const sql = getDatabase();
  await sql`
    INSERT INTO portal_sessions (token_hash, user_id, expires_at)
    VALUES (${digestToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);
  if (token && /^[a-f0-9]{64}$/i.test(token)) {
    const sql = getDatabase();
    await sql`DELETE FROM portal_sessions WHERE token_hash = ${digestToken(token)}`;
  }
}

export async function recordActivity(userId: string, action: string, details: Record<string, unknown> = {}) {
  try {
    const sql = getDatabase();
    await sql`
      INSERT INTO portal_activity (user_id, action, details)
      VALUES (${userId}, ${action}, ${JSON.stringify(details)}::jsonb)
    `;
  } catch (error) {
    console.error("Unable to record portal activity", error);
  }
}

export function checkSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export function authErrorResponse(status: 401 | 403, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser() {
  const user = await getCurrentUser();
  return user ? { user, response: null } : { user: null, response: authErrorResponse(401, "Sign in is required") };
}

export async function requirePermission(permission: AdminPermission) {
  const result = await requireUser();
  if (!result.user) return result;
  if (!userHasPermission(result.user, permission)) {
    return { user: null, response: authErrorResponse(403, "You do not have permission to perform this action") };
  }
  return { user: result.user, response: null };
}

export async function notifySuperAdminSecurityAlert({
  attemptedBy,
  action,
}: {
  attemptedBy: string;
  action: string;
}) {
  try {
    const sql = getDatabase();
    const [superAdmin] = await sql`
      SELECT email, full_name AS "fullName"
      FROM portal_users
      WHERE role = 'super_admin' AND is_active = TRUE
      ORDER BY created_at ASC
      LIMIT 1
    `;
    const targetEmail = superAdmin?.email || process.env.SUPER_ADMIN_EMAIL;
    const recipientName = superAdmin?.fullName || "Super Admin";

    if (!targetEmail) return;

    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    if (resendApiKey && emailFrom) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: emailFrom,
        to: targetEmail,
        subject: "⚠️ Security Alert: Attempted access to your Super Admin account",
        text: `Hello ${recipientName},\n\nSECURITY ALERT: Someone attempted to access or sign into your Super Admin account on ${new Date().toUTCString()}.\n\nDetails:\n- Attempted by: ${attemptedBy}\n- Action: ${action}\n- Target: Super Admin Account & System Control\n\nAre you the one attempting to sign in? If yes, you can sign in directly to your Super Admin account at:\n${appUrl}/sign-in?next=%2Fsuper-admin\n\nIf you did NOT attempt this, an unauthorized user tried to access your Super Admin account. Please verify your credentials immediately.\n\nBest regards,\nTranscriptPoint Security System`,
      });
    } else {
      console.log(`[SECURITY ALERT TO SUPER ADMIN: ${targetEmail}] ${attemptedBy} -> ${action}`);
    }
  } catch (err) {
    console.error("Failed to notify super admin of security alert", err);
  }
}

export async function requireSuperAdmin() {
  const result = await requireUser();
  if (!result.user) return result;
  if (result.user.role !== "super_admin") {
    await notifySuperAdminSecurityAlert({
      attemptedBy: `${result.user.fullName} (${result.user.email}) [Role: ${result.user.role}]`,
      action: "Attempted to execute an unauthorized Super Admin API call",
    });
    return { user: null, response: authErrorResponse(403, "Super admin access is required. A security notification was dispatched to the Super Admin.") };
  }
  return { user: result.user, response: null };
}
