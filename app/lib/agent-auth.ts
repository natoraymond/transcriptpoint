import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

export type AgentActor = {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  isAgent: boolean;
};

export async function getAgentActor(): Promise<AgentActor | null> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return null;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
  const superAdminEmail = process.env.TRANSCRIPTPOINT_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const isSuperAdmin = Boolean(superAdminEmail && email === superAdminEmail);
  const metadata = user.publicMetadata as { role?: unknown; accountStatus?: unknown };
  const isAgent = metadata.role === "agent" && metadata.accountStatus !== "disabled";

  return {
    userId,
    sessionId,
    email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || email,
    isSuperAdmin,
    isAgent,
  };
}

export async function getSuperAdminActor(): Promise<AgentActor | null> {
  const actor = await getAgentActor();
  return actor?.isSuperAdmin ? actor : null;
}
