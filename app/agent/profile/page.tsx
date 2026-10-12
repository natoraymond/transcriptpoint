import { UserProfile } from "@clerk/nextjs";

export default function AgentProfilePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <a href="/agent" className="mb-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950">← Back to agent dashboard</a>
        <UserProfile />
      </div>
    </main>
  );
}
