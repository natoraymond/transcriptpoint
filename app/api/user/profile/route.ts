import { NextResponse } from "next/server";
import { checkSameOrigin, recordActivity, requireUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

export async function GET() {
  const access = await requireUser();
  if (!access.user) return access.response;
  return NextResponse.json({ user: access.user }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireUser();
  if (!access.user) return access.response;
  try {
    const body = (await request.json()) as { fullName?: unknown; phoneNumber?: unknown };
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    if (!fullName || fullName.length > 120 || phoneNumber.length > 40) {
      return NextResponse.json({ error: "Enter a valid name and phone number" }, { status: 400 });
    }
    const sql = getDatabase();
    const [user] = await sql`
      UPDATE portal_users SET full_name = ${fullName}, phone_number = ${phoneNumber}, updated_at = NOW()
      WHERE id = ${access.user.id} AND is_active = TRUE
      RETURNING id, email, full_name AS "fullName", phone_number AS "phoneNumber", role, permissions
    `;
    if (!user) return NextResponse.json({ error: "Account is unavailable" }, { status: 401 });
    await recordActivity(access.user.id, "profile_updated");
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Unable to update portal profile", error);
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
  }
}
