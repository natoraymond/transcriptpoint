import { NextResponse } from "next/server";
import { getDatabase } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const options = await sql`
      SELECT value, label, amount_ngn AS amount, category,
        requires_dhl AS "requiresDhl", display_order AS "displayOrder", is_active AS "isActive"
      FROM transcript_options
      ORDER BY display_order, label
    `;

    return NextResponse.json({ options }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load transcript options", error);
    return NextResponse.json({ error: "Unable to load transcript options" }, { status: 500 });
  }
}
