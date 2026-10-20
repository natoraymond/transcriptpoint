import { NextResponse } from "next/server";
import { checkSameOrigin, recordActivity, requirePermission } from "../../../lib/auth";
import { getDatabase } from "../../../lib/db";

const allowedStatuses = new Set(["pending", "processing", "completed", "cancelled"]);

export async function PATCH(request: Request) {
  if (!checkSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requirePermission("requests.update");
  if (!access.user) return access.response;

  try {
    const body = (await request.json()) as { requestId?: unknown; status?: unknown };
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!/^\d+$/.test(requestId) || typeof body.status !== "string" || !allowedStatuses.has(body.status)) {
      return NextResponse.json({ error: "A valid request ID and status are required" }, { status: 400 });
    }

    const sql = getDatabase();
    const [updated] = await sql`
      UPDATE transcript_requests
      SET status = ${body.status}, updated_at = NOW()
      WHERE id = ${requestId}
      RETURNING id::text AS id, status
    `;
    if (!updated) return NextResponse.json({ error: "Transcript request not found" }, { status: 404 });

    await recordActivity(access.user.id, "request_status_updated", { requestId, status: body.status });

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("Unable to update transcript request", error);
    return NextResponse.json({ error: "Unable to update transcript request" }, { status: 500 });
  }
}
