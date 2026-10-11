"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Agent = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: number;
  lastActiveAt: number | null;
};

type Invitation = { id: string; email: string; createdAt: number };
type Activity = {
  id: number;
  actorEmail: string;
  action: string;
  targetEmail: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
type AgentData = { agents: Agent[]; invitations: Invitation[]; activity: Activity[] };

function formatTimestamp(timestamp: number | string | null) {
  if (!timestamp) return "Never";
  const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "—" : `${date.toISOString().slice(0, 16).replace("T", " · ")} UTC`;
}

const activityLabels: Record<string, string> = {
  agent_invited: "Invited an agent",
  agent_activated: "Reactivated an agent",
  agent_deactivated: "Deactivated an agent",
  agent_invitation_revoked: "Revoked an invitation",
  agent_login: "Signed in to the admin portal",
  section_viewed: "Viewed admin section",
};

export default function AgentsPage() {
  const [data, setData] = useState<AgentData>({ agents: [], invitations: [], activity: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/agents", { cache: "no-store" });
      const result = (await response.json()) as AgentData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load agent data");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load agent data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/agents", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as AgentData & { error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to load agent data");
        if (isMounted) setData(result);
      })
      .catch((loadError: unknown) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "Unable to load agent data");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const inviteAgent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsInviting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const result = (await response.json()) as { invitation?: Invitation; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send invitation");
      setInviteEmail("");
      setNotice(`An invitation was sent to ${result.invitation?.email ?? "the agent"}.`);
      await loadData();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const updateAgentStatus = async (agent: Agent) => {
    setPendingAction(agent.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agent.id, active: !agent.active }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update this agent");
      setNotice(`${agent.email} was ${agent.active ? "deactivated" : "reactivated"}.`);
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update this agent");
    } finally {
      setPendingAction("");
    }
  };

  const revokeInvitation = async (invitation: Invitation) => {
    setPendingAction(invitation.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/agents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to revoke this invitation");
      setNotice(`The invitation to ${invitation.email} was revoked.`);
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to revoke this invitation");
    } finally {
      setPendingAction("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">Super admin · Team access</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Agent management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Invite staff agents, manage portal access, and review their recorded admin activity.</p>
          </div>
          <a href="/admin" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">← Dashboard</a>
        </header>

        {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Invite a teammate</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Add an agent</h2>
            </div>
            <form onSubmit={inviteAgent} className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
              <label className="sr-only" htmlFor="agent-email">Agent email address</label>
              <input id="agent-email" type="email" autoComplete="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="agent@example.com" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              <button type="submit" disabled={isInviting} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{isInviting ? "Sending invite…" : "Send invitation"}</button>
            </form>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Invited agents receive a secure sign-up link by email. They are assigned agent-level access and cannot manage other agents.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active agents", value: data.agents.filter((agent) => agent.active).length, tone: "text-emerald-700 bg-emerald-50" },
            { label: "Inactive agents", value: data.agents.filter((agent) => !agent.active).length, tone: "text-slate-700 bg-slate-100" },
            { label: "Pending invitations", value: data.invitations.length, tone: "text-amber-700 bg-amber-50" },
          ].map((stat) => (
            <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900">
                {isLoading ? "—" : stat.value}
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stat.tone}`}>Team</span>
              </p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
            <div><h2 className="font-semibold text-slate-900">Agent accounts</h2><p className="mt-1 text-xs text-slate-500">Role and recent sign-in activity from Clerk</p></div>
            <button type="button" onClick={() => void loadData()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Agent</th><th className="px-5 py-3 font-semibold">Access</th><th className="px-5 py-3 font-semibold">Joined</th><th className="px-5 py-3 font-semibold">Last active</th><th className="px-5 py-3 text-right font-semibold">Manage</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{agent.name}</p><p className="mt-1 text-xs text-slate-500">{agent.email}</p></td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${agent.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{agent.active ? "Active" : "Deactivated"}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatTimestamp(agent.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatTimestamp(agent.lastActiveAt)}</td>
                    <td className="px-5 py-4 text-right"><button type="button" disabled={pendingAction === agent.id} onClick={() => void updateAgentStatus(agent)} className={`text-xs font-semibold disabled:opacity-50 ${agent.active ? "text-red-700 hover:text-red-900" : "text-blue-700 hover:text-blue-900"}`}>{pendingAction === agent.id ? "Saving…" : agent.active ? "Deactivate" : "Reactivate"}</button></td>
                  </tr>
                ))}
                {!isLoading && data.agents.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No agents yet. Invite your first teammate above.</td></tr>}
                {isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Loading agent accounts…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {data.invitations.length > 0 && (
          <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-white shadow-sm">
            <div className="border-b border-amber-100 px-5 py-4 sm:px-7"><h2 className="font-semibold text-slate-900">Pending invitations</h2><p className="mt-1 text-xs text-slate-500">Invitations can be revoked before they are accepted.</p></div>
            <div className="divide-y divide-slate-100">
              {data.invitations.map((invitation) => <div key={invitation.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-7"><div><p className="text-sm font-semibold text-slate-800">{invitation.email}</p><p className="mt-1 text-xs text-slate-500">Sent {formatTimestamp(invitation.createdAt)}</p></div><button type="button" disabled={pendingAction === invitation.id} onClick={() => void revokeInvitation(invitation)} className="self-start text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-50 sm:self-auto">{pendingAction === invitation.id ? "Revoking…" : "Revoke invite"}</button></div>)}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-7"><h2 className="font-semibold text-slate-900">Activity log</h2><p className="mt-1 text-xs text-slate-500">Agent portal sign-ins, section visits, and super-admin account changes</p></div>
          <div className="divide-y divide-slate-100">
            {data.activity.map((event) => (
              <article key={event.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{activityLabels[event.action] ?? event.action.replaceAll("_", " ")}{event.action === "section_viewed" && typeof event.details.section === "string" ? ` · ${event.details.section}` : ""}</p><p className="mt-1 truncate text-xs text-slate-500">{event.actorEmail}{event.targetEmail ? ` · ${event.targetEmail}` : ""}</p></div>
                <time className="shrink-0 text-xs text-slate-400">{formatTimestamp(event.createdAt)}</time>
              </article>
            ))}
            {!isLoading && data.activity.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-7">Activity appears here when an agent signs in or uses an admin section.</p>}
            {isLoading && <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-7">Loading activity…</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
