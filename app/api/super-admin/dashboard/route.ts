import { NextResponse } from "next/server";
import { requireSuperAdmin } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireSuperAdmin();
  if (!access.user) return access.response;

  try {
    const sql = getDatabase();
    const [userRows, requestRows, paymentRows, productRows, activityRows] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE role = 'user')::int AS users,
          COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
          COUNT(*) FILTER (WHERE role = 'super_admin')::int AS superAdmins,
          COUNT(*) FILTER (WHERE NOT is_active)::int AS suspended
        FROM portal_users
      `,
      sql`
        SELECT COUNT(*)::int AS "totalProducts",
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
        FROM transcript_requests
      `,
      sql`
        SELECT COUNT(*) FILTER (WHERE requests.payment_status = 'paid')::int AS paidCount,
          COALESCE(SUM(options.amount_ngn + COALESCE(requests.dhl_delivery_price_kobo, 0) / 100.0)
            FILTER (WHERE requests.payment_status = 'paid'), 0)::numeric AS paidValue
        FROM transcript_requests requests
        LEFT JOIN transcript_options options ON options.value = requests.transcript_format
      `,
      sql`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active)::int AS active
        FROM transcript_options
      `,
      sql`
        SELECT activity.id, activity.action, activity.details, activity.created_at AS "createdAt",
          users.full_name AS "actorName", users.email AS "actorEmail"
        FROM portal_activity activity
        JOIN portal_users users ON users.id = activity.user_id
        ORDER BY activity.created_at DESC LIMIT 12
      `,
    ]);

    const [products] = await Promise.all([
      sql`
        SELECT value, label, category, amount_ngn AS amount, is_active AS "isActive",
          requires_dhl AS "requiresDhl"
        FROM transcript_options
        ORDER BY display_order, label
      `,
    ]);

    const stats = {
      ...userRows[0],
      ...requestRows[0],
      ...paymentRows[0],
      ...productRows[0],
    };

    return NextResponse.json({
      stats: Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Number(value)])),
      products,
      activity: activityRows,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load Super Admin monitoring data", error);
    return NextResponse.json({ error: "Unable to load Super Admin monitoring data" }, { status: 500 });
  }
}
