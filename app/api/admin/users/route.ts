import { NextResponse } from "next/server";
import { checkSameOrigin, recordActivity, requirePermission } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

export async function GET() {
  const access = await requirePermission("users.read");
  if (!access.user) return access.response;
  try {
    const sql = getDatabase();
    const users = await sql`
      SELECT id, email, full_name AS "fullName", phone_number AS "phoneNumber",
        role, is_active AS "isActive", created_at AS "createdAt"
      FROM portal_users ORDER BY created_at DESC LIMIT 500
    `;
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load users for administrator", error);
    return NextResponse.json({ error: "Unable to load users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requirePermission("users.update");
  if (!access.user) return access.response;
  try {
    const body = await request.json() as { userId?: unknown; isActive?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!/^[0-9a-f-]{36}$/i.test(userId) || typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Provide a valid user and active status" }, { status: 400 });
    }
    const sql = getDatabase();
    const [updated] = await sql`
      UPDATE portal_users SET is_active = ${body.isActive}, updated_at = NOW()
      WHERE id = ${userId} AND role = 'user'
      RETURNING id, email, is_active AS "isActive"
    `;
    if (!updated) return NextResponse.json({ error: "User account not found or not manageable" }, { status: 404 });
    if (!body.isActive) await sql`DELETE FROM portal_sessions WHERE user_id = ${userId}`;
    await recordActivity(access.user.id, "user_account_status_updated", { targetUserId: userId, isActive: body.isActive });
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Unable to update user account status", error);
    return NextResponse.json({ error: "Unable to update user account" }, { status: 500 });
  }
}
