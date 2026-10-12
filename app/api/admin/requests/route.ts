import { NextResponse } from "next/server";
import { getSuperAdminActor } from "../../../lib/agent-auth";
import { getDatabase } from "../../../lib/db";

const allowedStatuses = new Set(["pending", "processing", "completed", "cancelled"]);

export async function PATCH(request: Request) {
  const actor = await getSuperAdminActor();
  if (!actor) return NextResponse.json({ error: "Super admin access required" }, { status: 403 });

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

    await sql`
      INSERT INTO agent_activity (actor_user_id, actor_email, action, target_email, details)
      VALUES (
        ${actor.userId}, ${actor.email}, 'request_status_updated', '',
        ${JSON.stringify({ requestId, status: body.status })}::jsonb
      )
    `;

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("Unable to update transcript request", error);
    return NextResponse.json({ error: "Unable to update transcript request" }, { status: 500 });
  }
}
