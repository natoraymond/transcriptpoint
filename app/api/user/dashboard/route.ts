import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

export async function GET() {
  const access = await requireUser();
  if (!access.user) return access.response;
  try {
    const sql = getDatabase();
    const [requests, activity, counts] = await Promise.all([
      sql`
        SELECT requests.id::text AS id, requests.campus, requests.status,
          requests.payment_status AS "paymentStatus", requests.created_at AS "createdAt",
          options.label AS service
        FROM transcript_requests requests
        LEFT JOIN transcript_options options ON options.value = requests.transcript_format
        WHERE requests.user_id = ${access.user.id}
        ORDER BY requests.created_at DESC LIMIT 100
      `,
      sql`
        SELECT id, action, details, created_at AS "createdAt"
        FROM portal_activity WHERE user_id = ${access.user.id}
        ORDER BY created_at DESC LIMIT 50
      `,
      sql`
        SELECT COUNT(*)::int AS "totalRequests",
          COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS "paidRequests",
          COUNT(*) FILTER (WHERE status = 'completed')::int AS "completedRequests"
        FROM transcript_requests WHERE user_id = ${access.user.id}
      `,
    ]);
    return NextResponse.json({ requests, activity, stats: counts[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load user dashboard", error);
    return NextResponse.json({ error: "Unable to load your dashboard" }, { status: 500 });
  }
}
