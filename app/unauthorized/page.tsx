import Link from "next/link";
import UniversalNavbar from "../components/universal-navbar";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <UniversalNavbar pageTitle="Access Denied" badge="Restricted" theme="white" />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-red-600 font-bold">Access restricted</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">You do not have access to this area</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your account does not have the role or permission required for this page.</p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">Return to home</Link>
        </section>
      </main>
    </div>
  );
}
