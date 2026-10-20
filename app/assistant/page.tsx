import { redirect } from "next/navigation";
import AssistantChat from "../components/assistant-chat";
import { getCurrentUser } from "../lib/auth";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Fassistant");
  return <AssistantChat />;
}
