import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const [statsRows, requestRows, paymentRows, monthlyRows, serviceRows] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS "totalRequests",
          COUNT(*) FILTER (WHERE status = 'pending')::int AS "pendingRequests",
          COUNT(*) FILTER (WHERE status = 'completed')::int AS "completedRequests",
          COALESCE(SUM(options.amount_ngn) FILTER (WHERE requests.payment_status = 'paid'), 0)::numeric AS "paidRevenue"
        FROM transcript_requests requests
        LEFT JOIN transcript_options options ON options.value = requests.transcript_format
      `,
      sql`
        SELECT requests.id::text AS id,
          CONCAT_WS(' ', requests.first_name, NULLIF(requests.other_name, ''), requests.surname) AS student,
          requests.campus, requests.recipient_institution AS institution,
          requests.year_of_graduation AS "yearOfGraduation",
          options.label AS "transcriptType", requests.status,
          requests.payment_status AS "paymentStatus", requests.created_at AS "createdAt"
        FROM transcript_requests requests
        LEFT JOIN transcript_options options ON options.value = requests.transcript_format
        ORDER BY requests.created_at DESC LIMIT 100
      `,
      sql`
        SELECT requests.id::text AS id,
          COALESCE(requests.payment_reference, requests.reference_number, CONCAT('TP-', requests.id)) AS reference,
          CONCAT_WS(' ', requests.first_name, requests.surname) AS payer,
          COALESCE(options.amount_ngn, 0)::numeric AS amount,
          requests.delivery_method AS method, requests.payment_status AS status,
          requests.created_at AS "createdAt"
        FROM transcript_requests requests
        LEFT JOIN transcript_options options ON options.value = requests.transcript_format
        WHERE requests.payment_reference IS NOT NULL OR requests.payment_status <> 'pending'
        ORDER BY requests.updated_at DESC LIMIT 100
      `,
      sql`
        SELECT TO_CHAR(months.month, 'Mon') AS month,
          TO_CHAR(months.month, 'YYYY-MM') AS key,
          COUNT(requests.id)::int AS count
        FROM generate_series(date_trunc('month', NOW()) - INTERVAL '7 months', date_trunc('month', NOW()), INTERVAL '1 month') AS months(month)
        LEFT JOIN transcript_requests requests ON date_trunc('month', requests.created_at) = months.month
        GROUP BY months.month ORDER BY months.month
      `,
      sql`
        SELECT COALESCE(options.category, 'Other') AS label, COUNT(requests.id)::int AS count,
          COALESCE(SUM(options.amount_ngn) FILTER (WHERE requests.payment_status = 'paid'), 0)::numeric AS revenue
        FROM transcript_requests requests
        LEFT JOIN transcript_options options ON options.value = requests.transcript_format
        GROUP BY options.category ORDER BY count DESC
      `,
    ]);

    const stats = statsRows[0] ?? { totalRequests: 0, pendingRequests: 0, completedRequests: 0, paidRevenue: 0 };
    return NextResponse.json({
      stats: {
        totalRequests: Number(stats.totalRequests),
        pendingRequests: Number(stats.pendingRequests),
        completedRequests: Number(stats.completedRequests),
        paidRevenue: Number(stats.paidRevenue),
      },
      requests: requestRows,
      payments: paymentRows,
      monthly: monthlyRows.map((row) => ({ month: row.month, count: Number(row.count) })),
      services: serviceRows.map((row) => ({ label: row.label, count: Number(row.count), revenue: Number(row.revenue) })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load admin dashboard data", error);
    return NextResponse.json({ error: "Unable to load dashboard data" }, { status: 500 });
  }
}
