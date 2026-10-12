import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";
import { getSuperAdminActor } from "../../../lib/agent-auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const accountStatuses = ["pending", "active", "suspended", "deactivated"] as const;
type AccountStatus = (typeof accountStatuses)[number];

async function writeActivity(actor: { userId: string; email: string }, action: string, targetEmail: string, details: Record<string, unknown> = {}) {
  const sql = getDatabase();
  await sql`
    INSERT INTO agent_activity (actor_user_id, actor_email, action, target_email, details)
    VALUES (${actor.userId}, ${actor.email}, ${action}, ${targetEmail}, ${JSON.stringify(details)}::jsonb)
  `;
}

export async function GET() {
  const actor = await getSuperAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  try {
    const client = await clerkClient();
    const [userResults, invitationResults, sql] = await Promise.all([
      client.users.getUserList({ limit: 100, orderBy: "-created_at" }),
      client.invitations.getInvitationList({ limit: 100, orderBy: "-created_at" }),
      Promise.resolve(getDatabase()),
    ]);
    const agentUsers = userResults.data.filter((user) => {
      const metadata = user.publicMetadata as { role?: unknown };
      return metadata.role === "agent";
    });
    const pendingInvitations = invitationResults.data.filter((invitation) => {
      const metadata = invitation.publicMetadata as { role?: unknown } | null;
      return metadata?.role === "agent" && invitation.status === "pending";
    });
    const activity = await sql`
      SELECT id, actor_email AS "actorEmail", action, target_email AS "targetEmail", details, created_at AS "createdAt"
      FROM agent_activity
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      agents: agentUsers.map((user) => ({
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Agent",
        email: user.primaryEmailAddress?.emailAddress ?? "",
        status: accountStatuses.includes((user.publicMetadata as { accountStatus?: AccountStatus }).accountStatus as AccountStatus)
          ? (user.publicMetadata as { accountStatus: AccountStatus }).accountStatus
          : "pending",
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
      })),
      invitations: pendingInvitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.emailAddress,
        createdAt: invitation.createdAt,
      })),
      activity,
    });
  } catch (error) {
    console.error("Unable to load agent management data", error);
    return NextResponse.json({ error: "Unable to load agent management data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await getSuperAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Enter a valid agent email address" }, { status: 400 });
    }
    if (email === actor.email) {
      return NextResponse.json({ error: "The super admin cannot be invited as an agent" }, { status: 400 });
    }

    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: new URL("/admin", request.url).toString(),
      // Invited accounts remain blocked until the super admin approves them.
      publicMetadata: { role: "agent", accountStatus: "pending" },
      notify: true,
    });
    await writeActivity(actor, "agent_invited", email, { invitationId: invitation.id });

    return NextResponse.json({ invitation: { id: invitation.id, email: invitation.emailAddress, createdAt: invitation.createdAt } }, { status: 201 });
  } catch (error) {
    console.error("Unable to invite agent", error);
    return NextResponse.json({ error: "Unable to send invitation. The email may already be registered or invited." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const actor = await getSuperAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { userId?: unknown; status?: unknown };
    if (typeof body.userId !== "string" || typeof body.status !== "string" || !accountStatuses.includes(body.status as AccountStatus)) {
      return NextResponse.json({ error: "Agent and a valid account status are required" }, { status: 400 });
    }
    if (body.userId === actor.userId) {
      return NextResponse.json({ error: "You cannot change your own super admin access" }, { status: 400 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(body.userId);
    const metadata = user.publicMetadata as { role?: unknown };
    if (metadata.role !== "agent") {
      return NextResponse.json({ error: "Agent account not found" }, { status: 404 });
    }

    const oldStatus = (user.publicMetadata as { accountStatus?: string }).accountStatus ?? "pending";
    const newStatus = body.status as AccountStatus;
    await client.users.updateUserMetadata(user.id, { publicMetadata: { accountStatus: newStatus } });
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const action = newStatus === "active"
      ? oldStatus === "pending" ? "agent_approved" : "agent_reactivated"
      : newStatus === "suspended"
        ? "agent_suspended"
        : oldStatus === "pending" ? "agent_rejected" : "agent_deactivated";

    // Revoke existing Clerk sessions on any blocked state. Authorization also
    // checks the current status on every server request, so a revoke failure
    // cannot preserve app access.
    if (newStatus !== "active") {
      const sessions = await client.sessions.getSessionList({ userId: user.id, status: "active", limit: 500 });
      const revokeResults = await Promise.allSettled(
        sessions.data.map((session) => client.sessions.revokeSession(session.id)),
      );
      if (revokeResults.some((result) => result.status === "rejected")) {
        console.error("One or more agent sessions could not be revoked", { userId: user.id });
      }
    }
    await writeActivity(actor, action, email, { userId: user.id, previousStatus: oldStatus, status: newStatus });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to update agent account", error);
    return NextResponse.json({ error: "Unable to update agent account" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const actor = await getSuperAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { invitationId?: unknown };
    if (typeof body.invitationId !== "string" || !body.invitationId.trim()) {
      return NextResponse.json({ error: "Invitation is required" }, { status: 400 });
    }

    const client = await clerkClient();
    const { data: matches } = await client.invitations.getInvitationList({ query: body.invitationId, limit: 1 });
    const invitation = matches.find((candidate) => candidate.id === body.invitationId);
    const metadata = invitation?.publicMetadata as { role?: unknown } | null | undefined;
    if (!invitation || metadata?.role !== "agent" || invitation.status !== "pending") {
      return NextResponse.json({ error: "Agent invitation not found" }, { status: 404 });
    }

    const revokedInvitation = await client.invitations.revokeInvitation(invitation.id);
    await writeActivity(actor, "agent_invitation_revoked", revokedInvitation.emailAddress, { invitationId: revokedInvitation.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to revoke agent invitation", error);
    return NextResponse.json({ error: "Unable to revoke agent invitation" }, { status: 500 });
  }
}
