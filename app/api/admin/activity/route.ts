import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";
import { getAgentActor } from "../../../lib/agent-auth";

const adminSections = new Set([
  "Overview",
  "Requests",
  "Students",
  "Institutions",
  "Payments",
  "Reports",
  "Settings",
]);

export async function POST(request: Request) {
  const actor = await getAgentActor();
  if (!actor || (!actor.isAgent && !actor.isSuperAdmin)) {
    return NextResponse.json({ error: "Agent access required" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { action?: unknown; section?: unknown };
    if (body.action !== "agent_login" && body.action !== "section_viewed") {
      return NextResponse.json({ error: "Unsupported activity event" }, { status: 400 });
    }
    if (body.action === "section_viewed" && (typeof body.section !== "string" || !adminSections.has(body.section))) {
      return NextResponse.json({ error: "Invalid admin section" }, { status: 400 });
    }

    const sql = getDatabase();
    await sql`
      INSERT INTO agent_activity (actor_user_id, actor_email, action, details, session_id, section)
      VALUES (
        ${actor.userId},
        ${actor.email},
        ${body.action},
        ${JSON.stringify(body.action === "section_viewed" ? { section: body.section } : {})}::jsonb,
        ${actor.sessionId},
        ${body.action === "section_viewed" ? body.section as string : ""}
      )
      ON CONFLICT (session_id, action, section) DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to record agent activity", error);
    return NextResponse.json({ error: "Unable to record activity" }, { status: 500 });
  }
}
