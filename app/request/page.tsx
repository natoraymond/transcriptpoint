import { redirect } from "next/navigation";
import Home from "../page";
import { getCurrentUser } from "../lib/auth";

export default async function RequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=%2Frequest");
  return <Home />;
}
