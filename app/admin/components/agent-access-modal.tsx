"use client";

import { useEffect, useState, type FormEvent } from "react";

type Agent = { id: string; name: string; email: string; status: "pending" | "active" | "suspended" | "deactivated" };
type Invitation = { id: string; email: string };

type AgentResponse = { agents: Agent[]; invitations: Invitation[]; error?: string };

export default function AgentAccessModal({ onClose }: { onClose: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/agents", { cache: "no-store" });
    const result = (await response.json()) as AgentResponse;
    if (!response.ok) throw new Error(result.error || "Unable to load agents");
    setAgents(result.agents);
    setInvitations(result.invitations);
  };

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/agents", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as AgentResponse;
        if (!response.ok) throw new Error(result.error || "Unable to load agents");
        if (mounted) {
          setAgents(result.agents);
          setInvitations(result.invitations);
        }
      })
      .catch((loadError: unknown) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Unable to load agents");
      });
    return () => { mounted = false; };
  }, []);

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { invitation?: Invitation; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send invitation");
      setEmail("");
      setNotice(`Invitation sent to ${result.invitation?.email ?? "agent"}. Access remains pending until you approve it.`);
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send invitation");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (agent: Agent, status: Agent["status"]) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agent.id, status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to change access");
      setNotice(`${agent.email} is now ${status}.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to change access");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (invitation: Invitation) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/agents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to revoke invitation");
      setNotice(`Invitation to ${invitation.email} revoked.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to revoke invitation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="agent-access-title" className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-700">Super admin only</p>
            <h2 id="agent-access-title" className="mt-2 text-2xl font-semibold text-slate-950">Agent access</h2>
            <p className="mt-1 text-sm text-slate-500">Invite teammates and approve or revoke access. New agents remain pending until approved.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close agent access" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Close</button>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
          <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="sidebar-agent-email">Agent email</label>
            <input id="sidebar-agent-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="agent@example.com" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <button disabled={busy} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{busy ? "Working…" : "Invite agent"}</button>
          </form>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Agent accounts</h3>
              <span className="text-xs text-slate-500">{agents.length} total</span>
            </div>
            <div className="divide-y divide-slate-100">
              {agents.map((agent) => (
                <article key={agent.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{agent.name}</p><p className="truncate text-xs text-slate-500">{agent.email}</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${agent.status === "active" ? "bg-emerald-50 text-emerald-700" : agent.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{agent.status}</span>
                    {agent.status === "pending" && <button type="button" disabled={busy} onClick={() => void updateStatus(agent, "active")} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Approve</button>}
                    {agent.status === "active" && <button type="button" disabled={busy} onClick={() => void updateStatus(agent, "suspended")} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50">Suspend</button>}
                    {agent.status !== "deactivated" && <button type="button" disabled={busy} onClick={() => void updateStatus(agent, "deactivated")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">{agent.status === "pending" ? "Reject" : "Deactivate"}</button>}
                    {(agent.status === "suspended" || agent.status === "deactivated") && <button type="button" disabled={busy} onClick={() => void updateStatus(agent, "active")} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">Reactivate</button>}
                  </div>
                </article>
              ))}
              {!agents.length && !error && <p className="px-4 py-8 text-center text-sm text-slate-500">Loading agent accounts or no agents have been invited yet.</p>}
            </div>
          </div>

          {!!invitations.length && <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Invitations awaiting sign-up</h3>
            <div className="mt-3 space-y-2">
              {invitations.map((invitation) => <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <span className="truncate text-sm text-slate-700">{invitation.email}</span>
                <button type="button" disabled={busy} onClick={() => void revoke(invitation)} className="shrink-0 text-xs font-semibold text-red-700 disabled:opacity-50">Revoke</button>
              </div>)}
            </div>
          </div>}

          <p className="text-xs leading-5 text-slate-500">Only the configured Super Admin can open this control or change agent status. Account changes are audited; suspended and deactivated agents are blocked from protected routes.</p>
        </div>
      </section>
    </div>
  );
}
