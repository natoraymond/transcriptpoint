import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAgentActor } from "../../lib/agent-auth";

export default async function AgentManagementLayout({ children }: { children: ReactNode }) {
  const actor = await getAgentActor();

  if (!actor) redirect("/sign-in");
  if (!actor.isSuperAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
        <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold text-slate-900">Super admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Agent accounts and activity records can only be managed by the TranscriptPoint super admin.</p>
        </section>
      </main>
    );
  }

  return children;
}
