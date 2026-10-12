import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAgentActor } from "../lib/agent-auth";

export default async function AgentLayout({ children }: { children: ReactNode }) {
  const actor = await getAgentActor();

  if (!actor) redirect("/sign-in");
  if (!actor.isAgent || actor.isSuperAdmin) redirect("/admin");

  return children;
}
