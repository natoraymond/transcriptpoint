"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UniversalNavbar from "./components/universal-navbar";

type TranscriptOption = {
  value: string;
  label: string;
  amount: number;
  category: string;
  requiresDhl: boolean;
  isActive: boolean;
};

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const steps = [
    {
      number: "01",
      title: "Get started",
      description: "Open the application portal and begin your transcript request whenever it suits you.",
      icon: "↗",
    },
    {
      number: "02",
      title: "Provide your details",
      description: "Add your personal and academic information, then tell us where your transcript should go.",
      icon: "✎",
    },
    {
      number: "03",
      title: "Submit your request",
      description: "Review your information carefully and send your completed request for processing.",
      icon: "✓",
    },
    {
      number: "04",
      title: "Track your request",
      description: "Check in through the portal to follow the progress of your request.",
      icon: "⌁",
    },
  ];

  const benefits = [
    { title: "Convenient application", description: "Initiate your transcript request online, on your schedule.", icon: "◷" },
    { title: "A simple process", description: "Follow a clear, guided application from start to submission.", icon: "✳" },
    { title: "Request tracking", description: "Keep up with your request status through the portal.", icon: "⌁" },
    { title: "Helpful information", description: "Find what you need to prepare and complete your application.", icon: "i" },
  ];

  return (
    <div className="landing-page min-h-screen overflow-hidden bg-[#f8f8f5] text-[#142a27]">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 lg:px-12 lg:py-7">
        <a href="#home" className="flex items-center gap-2.5 sm:gap-3" aria-label="TranscriptPoint home">
          <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[12px] sm:rounded-[14px] bg-[#173d35] text-white shadow-lg shadow-[#173d35]/15">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true">
              <path d="M6 3.75h8l4 4v12.5H6a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M14 4v4h4M8 12h8M8 15.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[16px] sm:text-[17px] font-bold tracking-[-0.04em]">Transcript<span className="text-[#718c50]">Point</span></span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
          <a href="#how-it-works" className="text-sm font-medium text-[#536661] transition hover:text-[#173d35]">How it works</a>
          <a href="#why-transcriptpoint" className="text-sm font-medium text-[#536661] transition hover:text-[#173d35]">Why TranscriptPoint</a>
          <Link href="/assistant" className="text-sm font-medium text-[#536661] transition hover:text-[#173d35]">Help &amp; support</Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link href="/sign-in" className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-[#173c5c] transition hover:bg-[#edf2e8] hover:text-[#12314a] sm:px-3.5 sm:py-2">
            Sign in
          </Link>
          <Link href="/admin" aria-label="Open admin dashboard" className="hidden sm:inline-block rounded-full px-3 py-2 text-xs font-semibold text-[#536661] transition hover:bg-[#edf2e8] hover:text-[#173d35] sm:text-sm sm:px-4 sm:py-2.5">
            Admin
          </Link>
          <button type="button" onClick={onGetStarted} className="inline-flex items-center gap-1.5 rounded-full bg-[#173d35] px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#173d35]/15 transition hover:-translate-y-0.5 hover:bg-[#245246] sm:gap-2 sm:px-5 sm:py-3 sm:text-sm">
            <span>Get started</span> <span aria-hidden="true">↗</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="absolute left-4 right-4 top-full mt-2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md md:hidden z-30">
            <nav className="flex flex-col space-y-2.5 text-sm font-medium text-slate-700">
              <Link
                href="/request"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-[#173d35] px-3.5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[#245246]"
              >
                Start Transcript Request ↗
              </Link>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 transition hover:bg-slate-100 hover:text-[#173d35]"
              >
                How it works
              </a>
              <a
                href="#why-transcriptpoint"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 transition hover:bg-slate-100 hover:text-[#173d35]"
              >
                Why TranscriptPoint
              </a>
              <Link
                href="/assistant"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 transition hover:bg-slate-100 hover:text-[#173d35]"
              >
                Help &amp; support
              </Link>
              <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Admin portal
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="home">
        <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-6 sm:gap-12 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:px-12 lg:pb-28 lg:pt-14">
          <div className="relative z-[1] max-w-2xl">
            <div className="mb-5 sm:mb-7 inline-flex items-center gap-2 rounded-full border border-[#dce5d7] bg-white/75 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#536c42] shadow-sm sm:px-3.5 sm:py-2 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-[#82a05a]" />
              YOUR ACADEMIC RECORDS, SIMPLIFIED
            </div>
            <h1 className="text-[2.25rem] sm:text-[clamp(2.8rem,6vw,5.15rem)] font-semibold leading-[1.1] sm:leading-[1.04] tracking-[-0.05em] sm:tracking-[-0.065em] text-[#173d35]">
              Welcome to<br />TranscriptPoint<span className="text-[#88a365]">.</span>
            </h1>
            <p className="mt-4 sm:mt-7 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-[#5a6b66] sm:text-xl sm:leading-9">
              Request your academic transcript through a simple, convenient, and user-friendly online process.
            </p>
            <p className="mt-3 sm:mt-4 max-w-xl text-sm leading-6 sm:text-[15px] sm:leading-7 text-[#71807b]">
              TranscriptPoint helps graduates and eligible students and alumni initiate transcript requests, provide the necessary information, and track progress through a centralized portal.
            </p>
            <div className="mt-7 sm:mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <button type="button" onClick={onGetStarted} className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#173d35] px-6 py-3.5 text-sm sm:text-[15px] sm:px-7 sm:py-4 font-semibold text-white shadow-[0_14px_30px_rgba(23,61,53,.18)] transition hover:-translate-y-0.5 hover:bg-[#245246]">
                Get started <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </button>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-[#456058] transition hover:bg-white hover:text-[#173d35] sm:border-0 sm:bg-transparent sm:px-4 sm:py-3">
                See how it works <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="mt-7 sm:mt-9 flex items-center gap-3 text-xs font-medium text-[#77847e]">
              <span className="flex -space-x-2" aria-hidden="true">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f8f8f5] bg-[#dce6d4] text-[10px] text-[#35513b]">TP</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f8f8f5] bg-[#e9dfcb] text-[10px] text-[#735e3c]">✓</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f8f8f5] bg-[#d8e5e0] text-[10px] text-[#315a4e]">↗</span>
              </span>
              A clear path from application to delivery
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div className="absolute -right-10 -top-12 h-56 w-56 rounded-full bg-[#e7eddd] blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-12 h-48 w-48 rounded-full bg-[#e8eee7] blur-3xl pointer-events-none" />
            <div className="relative rounded-[26px] sm:rounded-[30px] border border-[#e7e9e1] bg-white p-4 shadow-[0_35px_90px_rgba(35,58,49,.12)] sm:p-6">
              <div className="flex items-center justify-between border-b border-[#edf0e9] pb-4 sm:pb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-[#edf2e8] text-[#4d6841]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true"><path d="M6 3.75h8l4 4v12.5H6a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 4v4h4M8 12h8M8 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  </span>
                  <div><p className="text-xs sm:text-sm font-semibold text-[#253b34]">Your transcript request</p><p className="mt-0.5 text-[11px] sm:text-xs text-[#87928c]">A straightforward process, all in one place</p></div>
                </div>
                <span className="rounded-full bg-[#eef4e9] px-2.5 py-1 text-[9px] sm:px-3 sm:py-1.5 sm:text-[10px] font-bold uppercase tracking-[.12em] text-[#60794e]">Portal</span>
              </div>

              <div className="py-5 sm:py-6">
                <div className="mb-4 sm:mb-6 flex items-end justify-between">
                  <div><p className="text-[10px] sm:text-xs font-medium text-[#87928c]">APPLICATION JOURNEY</p><p className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-[#203a32]">Four simple steps</p></div>
                  <span className="text-xs font-medium text-[#9aa49e]">01 — 04</span>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  {[
                    ["01", "Your details", "Personal & academic information", "done"],
                    ["02", "Delivery details", "Choose where it should be sent", "active"],
                    ["03", "Review & submit", "Check everything before sending", "next"],
                    ["04", "Track progress", "Follow your request in the portal", "next"],
                  ].map(([number, title, caption, status]) => (
                    <div key={number} className={`flex items-center gap-2.5 sm:gap-3 rounded-2xl border p-3 sm:p-3.5 ${status === "active" ? "border-[#dce6d5] bg-[#f7f9f3]" : "border-[#f0f1ed] bg-white"}`}>
                      <span className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${status === "done" ? "bg-[#e8efe2] text-[#5d774c]" : status === "active" ? "bg-[#173d35] text-white" : "bg-[#f3f4f0] text-[#9aa49e]"}`}>{status === "done" ? "✓" : number}</span>
                      <div className="min-w-0 flex-1"><p className="text-xs sm:text-sm font-semibold text-[#30443d]">{title}</p><p className="mt-0.5 truncate text-[11px] sm:text-xs text-[#8a9690]">{caption}</p></div>
                      {status === "active" && <span className="hidden rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#617a4f] sm:inline">UP NEXT</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#f5f7f2] px-3.5 py-3 sm:px-4 sm:py-3.5">
                <div className="flex items-center gap-2 sm:gap-2.5"><span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-xs sm:text-sm text-[#718c50]">✓</span><span className="text-xs font-medium text-[#53665d]">Your information, organized</span></div>
                <span className="text-[11px] sm:text-xs font-semibold text-[#6d8355]">Simple &amp; secure</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 sm:hidden text-center text-xs text-slate-500">
              <span className="text-[#66814d] font-bold">↗</span>
              <span>Start when you&apos;re ready · Your request, at your pace</span>
            </div>
            <div className="absolute -bottom-5 -right-2 hidden items-center gap-3 rounded-2xl border border-[#edf0e9] bg-white px-4 py-3 shadow-[0_16px_45px_rgba(35,58,49,.11)] sm:flex lg:-right-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eff4e9] text-[#66814d]">↗</span>
              <div><p className="text-xs font-semibold text-[#31463d]">Start when you’re ready</p><p className="mt-0.5 text-[10px] text-[#89958e]">Your request, at your pace</p></div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#718c50]">How it works</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] text-[#173d35] sm:text-4xl">A clear process, from start to finish.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#71807b] sm:text-base">Everything you need to request and follow up on your academic transcript, in one convenient place.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
              {steps.map((step) => (
                <article key={step.number} className="group rounded-[22px] border border-[#e9ece5] bg-[#fbfcf9] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#d7e2ce] hover:shadow-[0_18px_40px_rgba(35,58,49,.07)] sm:p-7">
                  <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf2e8] text-lg text-[#587348] transition group-hover:bg-[#173d35] group-hover:text-white">{step.icon}</span><span className="text-xs font-bold tracking-[.14em] text-[#a4ada6]">{step.number}</span></div>
                  <h3 className="mt-7 text-base font-semibold text-[#243c33]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#78867f]">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="why-transcriptpoint" className="scroll-mt-8 bg-[#f3f5ef] py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:gap-20 lg:px-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#718c50]">Why TranscriptPoint?</p>
              <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-.045em] text-[#173d35] sm:text-4xl">Less uncertainty. A simpler way forward.</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#71807b] sm:text-base">From your first details to checking your request status, the portal brings the important steps together.</p>
              <button type="button" onClick={onGetStarted} className="mt-7 inline-flex items-center gap-3 rounded-full border border-[#cbd8c3] bg-white px-5 py-3 text-sm font-semibold text-[#29483d] transition hover:border-[#173d35] hover:bg-[#173d35] hover:text-white">Start your request <span aria-hidden="true">→</span></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-[20px] border border-[#e4e9df] bg-white p-5 sm:p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3e9] text-lg font-semibold text-[#617b4e]">{benefit.icon}</span>
                  <h3 className="mt-5 text-sm font-semibold text-[#294238]">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#7b8982]">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] bg-[#173d35] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="absolute -left-20 -top-28 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -bottom-44 -right-12 h-96 w-96 rounded-full border border-white/10" />
            <div className="relative mx-auto max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-[#c3d4a7]">Ready when you are</span>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] text-white sm:text-4xl">Ready to request your transcript?</h2>
              <p className="mt-4 text-sm leading-7 text-[#d0ddd7] sm:text-base">Start your transcript request today using our online portal.</p>
              <button type="button" onClick={onGetStarted} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#dce8c9] px-7 py-4 text-sm font-bold text-[#244238] shadow-lg transition hover:-translate-y-0.5 hover:bg-white">Get started <span aria-hidden="true">→</span></button>
              <p className="mt-5 text-xs leading-5 text-[#b9cbc3]">Please ensure you provide accurate information when submitting your request.</p>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label} <span className="font-semibold text-red-500">*</span>
      </span>
      {children}
    </label>
  );
}

const initialFormState = {
  campus: "",
  transcriptFormat: "",
  modeOfAdmission: "",
  levelOfStudy: "",
  matriculationNumber: "",
  documentType: "",
  firstName: "",
  otherName: "",
  surname: "",
  phoneNumber: "",
  email: "",
  monthOfGraduation: "",
  yearOfGraduation: "",
  recipientInstitution: "",
  recipientAddress: "",
  deliveryMethod: "email",
  dhlContinent: "",
  dhlCountry: "",
  dhlCountryCode: "",
  dhlState: "",
  referenceNumber: "",
  receiverEmail: "",
};

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [formData, setFormData] = useState(initialFormState);
  const [transcriptOptions, setTranscriptOptions] = useState<TranscriptOption[]>([]);
  const [selectedTranscriptCategory, setSelectedTranscriptCategory] = useState("");
  const [isTranscriptDropdownOpen, setIsTranscriptDropdownOpen] = useState(false);
  const [transcriptFormatError, setTranscriptFormatError] = useState(false);
  const [isLoadingTranscriptOptions, setIsLoadingTranscriptOptions] = useState(true);
  const [transcriptOptionsError, setTranscriptOptionsError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isDhlModalOpen, setIsDhlModalOpen] = useState(false);
  const [dhlContinents, setDhlContinents] = useState<string[]>([]);
  const [dhlCountries, setDhlCountries] = useState<Array<{ countryCode: string; countryName: string; continent: string; hasRates: boolean }>>([]);
  const [dhlStates, setDhlStates] = useState<Array<{ stateName: string; priceKobo: number | null }>>([]);
  const [isLoadingDhlRates, setIsLoadingDhlRates] = useState(false);
  const [dhlRatesError, setDhlRatesError] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/transcript-options", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { options?: TranscriptOption[]; error?: string };
        if (!response.ok || !result.options) throw new Error(result.error || "Unable to load transcript options");
        if (isMounted) {
          const activeOptions = result.options.filter((option) => option.isActive);
          setTranscriptOptions(activeOptions);
          setSelectedTranscriptCategory(
            activeOptions.find((option) => option.category.toLowerCase().includes("softcopy"))?.category ??
              activeOptions[0]?.category ??
              "",
          );
        }
      })
      .catch((error) => {
        if (isMounted) setTranscriptOptionsError(error instanceof Error ? error.message : "Unable to load transcript options");
      })
      .finally(() => {
        if (isMounted) setIsLoadingTranscriptOptions(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange =
    (field: keyof typeof initialFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.transcriptFormat) {
      setTranscriptFormatError(true);
      setIsTranscriptDropdownOpen(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/transcript-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !result.id) {
        throw new Error(result.error || "Unable to save your request");
      }

      sessionStorage.setItem(
        "transcript-request",
        JSON.stringify({ ...formData, requestId: result.id }),
      );
      router.push("/payment");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save your request");
      setIsSubmitting(false);
    }
  };

  const selectDeliveryMethod = async (deliveryMethod: "email" | "dhl") => {
    setFormData((prev) => ({ ...prev, deliveryMethod }));

    if (deliveryMethod !== "dhl") {
      setIsDhlModalOpen(false);
      return;
    }

    setIsDhlModalOpen(true);
    if (dhlCountries.length > 0) return;

    setIsLoadingDhlRates(true);
    setDhlRatesError("");
    try {
      const response = await fetch("/api/transcript-requests");
      const result = (await response.json()) as {
        continents?: string[];
        countries?: Array<{ countryCode: string; countryName: string; continent: string; hasRates: boolean }>;
        error?: string;
      };

      if (!response.ok || !result.countries || !result.continents) {
        throw new Error(result.error || "Unable to load DHL delivery rates");
      }

      setDhlCountries(result.countries);
      setDhlContinents(result.continents);
    } catch (error) {
      setDhlRatesError(error instanceof Error ? error.message : "Unable to load DHL delivery rates");
    } finally {
      setIsLoadingDhlRates(false);
    }
  };

  const loadDhlStates = async (countryCode: string) => {
    const country = dhlCountries.find((item) => item.countryCode === countryCode);
    setDhlStates([]);
    setFormData((previous) => ({
      ...previous,
      dhlCountryCode: countryCode,
      dhlCountry: country?.countryName ?? "",
      dhlContinent: country?.continent ?? "",
      dhlState: "",
    }));
    if (!countryCode) return;

    setIsLoadingDhlRates(true);
    setDhlRatesError("");
    try {
      const response = await fetch(`/api/transcript-requests?countryCode=${encodeURIComponent(countryCode)}`);
      const result = await response.json() as {
        states?: Array<{ stateName: string; priceKobo: number | null }>;
        error?: string;
      };
      if (!response.ok || !result.states) {
        throw new Error(result.error || "Unable to load destination states and rates");
      }
      setDhlStates(result.states);
    } catch (error) {
      setDhlRatesError(error instanceof Error ? error.message : "Unable to load destination states and rates");
    } finally {
      setIsLoadingDhlRates(false);
    }
  };

  const selectedDhlRate = dhlStates.find((state) => state.stateName === formData.dhlState);
  const countriesInSelectedContinent = dhlCountries.filter((country) => country.continent === formData.dhlContinent);
  const selectedTranscriptOption = transcriptOptions.find((option) => option.value === formData.transcriptFormat);
  const isHardcopyTranscript = selectedTranscriptOption?.requiresDhl ?? false;
  const transcriptCategories = Array.from(new Set(transcriptOptions.map((option) => option.category)));
  const visibleTranscriptCategory = selectedTranscriptOption?.category ?? (selectedTranscriptCategory || transcriptCategories[0] || "");
  const visibleTranscriptOptions = transcriptOptions.filter((option) => option.category === visibleTranscriptCategory);

  if (pathname !== "/request") {
    return <LandingPage onGetStarted={() => router.push("/request")} />;
  }

  const handleTranscriptFormatChange = (transcriptFormat: string) => {
    setFormData((prev) => ({ ...prev, transcriptFormat }));
    setTranscriptFormatError(false);
    setIsTranscriptDropdownOpen(false);
    const selectedOption = transcriptOptions.find((option) => option.value === transcriptFormat);

    if (selectedOption?.requiresDhl) {
      void selectDeliveryMethod("dhl");
    } else if (formData.deliveryMethod === "dhl") {
      void selectDeliveryMethod("email");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f5] text-[#142a27]">
      <UniversalNavbar
        pageTitle="Request Portal"
        badge="Online Service"
        theme="emerald"
        extraLinks={[
          { label: "Track Request", href: "/dashboard" },
        ]}
      />
      <div className="px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-white/60 bg-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <main className="px-4 pb-6 pt-6 sm:px-8 sm:pb-8">
          <div className="rounded-[22px] border border-white/40 bg-[#e8ebeb]/35 px-4 py-5 shadow-inner shadow-white/30 sm:px-6 sm:py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]">
                Transcript request form
              </h1>
              <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                Fields marked <span className="font-semibold text-red-500">*</span> are required
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <section className="rounded-xl border border-white/60 bg-[#f1f3f3]/40 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                    01
                  </span>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Student details
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Campus">
                    <select className="form-input" value={formData.campus} onChange={handleChange("campus")} required>
                      <option value="">Select campus</option>
                      <option>NWAFOR-ORIZU COLLEGE OF EDUCATION, NSUGBE, ANAMBRA STATE</option>
                      <option>ALVAN IKOKU COLLEGE OF EDUCATION</option>
                      <option>YARATECH</option>
                      <option>SANOWICH OWERRI</option>
                      <option>DISTANCE LEARNING (LAGOS)</option>
                      <option>WERE EKIITI (REGULAR)</option>
                      <option>IKERE EKITI (SANDWICH)</option>
                      <option>SPIRITAN SCHOOL OF PHILOSOPHY ISHENU</option>
                      <option>ONDO</option>
                      <option>UNN DIPLOMA</option>
                      <option>DIPLOMA IN ARCHEOLOGY</option>
                      <option>DIPLOMA IN LINGUISTICS</option>
                      <option>UNN SANDWICH</option>
                      <option>DIPLOMA IN AGRIC TURE</option>
                      <option>DIPLOMA IN EDUCATION</option>
                      <option>DIPLOMA IN PHYSICAL SCIENCE</option>
                      <option>NSUKKA CAMPUS</option>
                      <option>ENUGU CAMPUS</option>
                    </select>
                  </Field>

                  <fieldset className="min-w-0">
                    <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Transcript format <span className="font-semibold text-red-500">*</span>
                    </legend>
                    {isLoadingTranscriptOptions ? (
                      <p className="rounded-xl border border-slate-300 bg-white/50 p-3 text-sm text-slate-500">Loading transcript formats...</p>
                    ) : transcriptOptions.length > 0 ? (
                      <>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {transcriptCategories.map((category) => {
                            const isSelected = visibleTranscriptCategory === category;
                            const formatCount = transcriptOptions.filter((option) => option.category === category).length;
                            return (
                              <button
                                key={category}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => {
                                  setSelectedTranscriptCategory(category);
                                  if (selectedTranscriptOption?.category !== category) {
                                    handleTranscriptFormatChange("");
                                  }
                                  setIsTranscriptDropdownOpen(true);
                                }}
                                className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${isSelected ? "border-[#173c5c] bg-[#edf4f8] text-[#173c5c] shadow-sm" : "border-slate-300 bg-white/50 text-slate-700 hover:border-slate-400 hover:bg-white"}`}
                              >
                                <span className="text-sm font-semibold">{category}</span>
                                <span className="flex shrink-0 items-center gap-2 text-[10px] font-medium text-slate-500">
                                  {formatCount} {formatCount === 1 ? "option" : "options"}
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    aria-hidden="true"
                                    className={`h-4 w-4 transition-transform ${isSelected ? "rotate-180" : ""}`}
                                  >
                                    <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Choose a {visibleTranscriptCategory.toLowerCase()} option
                        </label>
                        <div className="relative mt-2" onKeyDown={(event) => {
                          if (event.key === "Escape") setIsTranscriptDropdownOpen(false);
                        }}>
                          <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={isTranscriptDropdownOpen}
                            aria-controls="transcript-format-options"
                            aria-label={`Transcript format: ${selectedTranscriptOption?.label ?? "Select transcript format"}`}
                            aria-describedby={transcriptFormatError ? "transcript-format-error" : undefined}
                            onClick={() => setIsTranscriptDropdownOpen((isOpen) => !isOpen)}
                            className={`form-input flex min-h-12 items-center justify-between gap-3 text-left ${transcriptFormatError ? "border-red-500" : ""}`}
                          >
                            <span className={selectedTranscriptOption ? "text-slate-900" : "text-slate-500"}>
                              {selectedTranscriptOption?.label ?? "Select transcript format"}
                            </span>
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              aria-hidden="true"
                              className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${isTranscriptDropdownOpen ? "rotate-180" : ""}`}
                            >
                              <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          {isTranscriptDropdownOpen && (
                            <div
                              id="transcript-format-options"
                              role="listbox"
                              aria-label={`${visibleTranscriptCategory} transcript formats`}
                              className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                            >
                              {visibleTranscriptOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  role="option"
                                  aria-selected={formData.transcriptFormat === option.value}
                                  onClick={() => handleTranscriptFormatChange(option.value)}
                                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 ${formData.transcriptFormat === option.value ? "bg-[#edf4f8] text-[#173c5c]" : "text-slate-800"}`}
                                >
                                  <span className="min-w-0 text-sm font-medium">{option.label}{option.requiresDhl ? " · DHL delivery required" : ""}</span>
                                  <span className="shrink-0 text-sm font-semibold">N{Number(option.amount).toLocaleString("en-NG")}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {transcriptFormatError && <span id="transcript-format-error" role="alert" className="mt-2 block text-xs font-medium text-red-600">Select a transcript format to continue.</span>}
                      </>
                    ) : (
                      <p className="rounded-xl border border-slate-300 bg-white/50 p-3 text-sm text-slate-500">No transcript formats are currently available.</p>
                    )}
                    {transcriptOptionsError && <span role="alert" className="mt-2 block text-xs font-medium text-red-600">{transcriptOptionsError}. Please refresh and try again.</span>}
                    {isHardcopyTranscript && <span className="mt-2 block text-xs font-medium text-[#173c5c]">Hardcopy transcripts require DHL. Select a destination in Delivery details below.</span>}
                  </fieldset>

                  <Field label="Mode of admission">
                    <select className="form-input" value={formData.modeOfAdmission} onChange={handleChange("modeOfAdmission")} required>
                      <option value="">Select your admission category</option>
                      <option>UTME</option>
                      <option>SANDWICH</option>
                      <option>DIRECT ENTRY</option>
                    </select>
                  </Field>

                  <Field label="Level of study">
                    <select className="form-input" value={formData.levelOfStudy} onChange={handleChange("levelOfStudy")} required>
                      <option value="">Select level</option>
                      <option>Undergraduate</option>
                      <option>Postgraduate</option>
                    </select>
                  </Field>

                  <Field label="Matriculation number">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Enter matriculation number"
                      value={formData.matriculationNumber}
                      onChange={handleChange("matriculationNumber")}
                      required
                    />
                  </Field>

                  <Field label="Document type">
                    <select className="form-input" value={formData.documentType} onChange={handleChange("documentType")} required>
                      <option value="">Select document type</option>
                      <option>Transcript</option>
                      <option>Certificate</option>
                      <option>Academic record</option>
                    </select>
                  </Field>

                  <Field label="First name">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Your first name"
                      value={formData.firstName}
                      onChange={handleChange("firstName")}
                      required
                    />
                  </Field>

                  <Field label="Other name">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Your other name"
                      value={formData.otherName}
                      onChange={handleChange("otherName")}
                      required
                    />
                  </Field>

                  <Field label="Surname">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Your surname"
                      value={formData.surname}
                      onChange={handleChange("surname")}
                      required
                    />
                  </Field>

                  <Field label="Phone number">
                    <input
                      className="form-input"
                      type="tel"
                      placeholder="Your phone number"
                      value={formData.phoneNumber}
                      onChange={handleChange("phoneNumber")}
                      required
                    />
                  </Field>

                  <Field label="E-mail">
                    <input
                      className="form-input"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange("email")}
                      required
                    />
                  </Field>

                  <Field label="Month of graduation">
                    <select className="form-input" value={formData.monthOfGraduation} onChange={handleChange("monthOfGraduation")} required>
                      <option value="">Select month</option>
                      <option>January</option>
                      <option>February</option>
                      <option>March</option>
                      <option>April</option>
                      <option>May</option>
                      <option>June</option>
                      <option>July</option>
                      <option>August</option>
                      <option>September</option>
                      <option>October</option>
                      <option>November</option>
                      <option>December</option>
                    </select>
                  </Field>

                  <Field label="Year of graduation">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. 2024"
                      value={formData.yearOfGraduation}
                      onChange={handleChange("yearOfGraduation")}
                      required
                    />
                  </Field>
                </div>
              </section>

              <section className="rounded-xl border border-white/60 bg-[#f1f3f3]/40 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                    02
                  </span>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Delivery details
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Recipient institution / organization" className="md:col-span-2">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Who should receive your transcript?"
                      value={formData.recipientInstitution}
                      onChange={handleChange("recipientInstitution")}
                      required
                    />
                  </Field>

                  <Field label="Recipient address" className="md:col-span-2">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Street, city, country"
                      value={formData.recipientAddress}
                      onChange={handleChange("recipientAddress")}
                      required
                    />
                  </Field>

                  <fieldset className="md:col-span-2">
                    <legend className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Delivery method <span className="font-semibold text-red-500">*</span>
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white/50 p-3 transition has-[:checked]:border-[#173c5c] has-[:checked]:bg-white">
                        <input
                          className="h-4 w-4 accent-[#173c5c]"
                          type="radio"
                          name="deliveryMethod"
                          value="email"
                          checked={formData.deliveryMethod === "email"}
                          onChange={() => selectDeliveryMethod("email")}
                          disabled={isHardcopyTranscript}
                          required
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">Email delivery</span>
                          <span className="block text-xs text-slate-500">Receive the transcript electronically</span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white/50 p-3 transition has-[:checked]:border-[#173c5c] has-[:checked]:bg-white">
                        <input
                          className="h-4 w-4 accent-[#173c5c]"
                          type="radio"
                          name="deliveryMethod"
                          value="dhl"
                          checked={formData.deliveryMethod === "dhl"}
                          onChange={() => selectDeliveryMethod("dhl")}
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">DHL delivery</span>
                          <span className="block text-xs text-slate-500">Send a physical copy by courier</span>
                        </span>
                      </label>
                    </div>
                  </fieldset>

                  <Field label="Reference number">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="If applicable"
                      value={formData.referenceNumber}
                      onChange={handleChange("referenceNumber")}
                    />
                  </Field>

                  <Field label="Receiver email address">
                    <input
                      className="form-input"
                      type="email"
                      placeholder="recipient@example.com"
                      value={formData.receiverEmail}
                      onChange={handleChange("receiverEmail")}
                      required
                    />
                  </Field>
                </div>
              </section>

              <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  Your details are safely used to process the transcript request.
                </p>
                {submitError && <p className="text-xs font-medium text-red-600">{submitError}</p>}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-[#173c5c] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(23,60,92,0.25)] transition hover:bg-[#12314a]"
                >
                  {isSubmitting ? "Saving request..." : "Proceed to Payment →"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>

      <Link
        href="/assistant"
        aria-label="Chat with support"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#173c5c] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(23,60,92,0.3)] transition hover:-translate-y-0.5 hover:bg-[#12314a] sm:bottom-8 sm:right-8"
      >
        <span aria-hidden="true" className="text-base">?</span>
        Chat with support
      </Link>

      {isDhlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dhl-modal-title"
            className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Courier delivery</p>
                <h2 id="dhl-modal-title" className="mt-2 text-xl font-semibold text-slate-900">DHL delivery details</h2>
              </div>
              <button
                type="button"
                aria-label="Close DHL delivery details"
                onClick={() => selectDeliveryMethod("email")}
                className="text-2xl leading-none text-slate-400 transition hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Your transcript will be prepared for physical delivery by DHL using the recipient and address details above.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Recipient</p>
              <p className="mt-1">{formData.recipientInstitution || "Institution not entered yet"}</p>
              <p className="mt-1">{formData.recipientAddress || "Address not entered yet"}</p>
            </div>
            <div className="mt-4">
              <label htmlFor="dhl-continent" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                DHL destination <span className="font-semibold text-red-500">*</span>
              </label>
              {isLoadingDhlRates ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Loading delivery rates...</p>
              ) : dhlRatesError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{dhlRatesError}</p>
              ) : (
                <div className="space-y-3">
                  <select
                    id="dhl-continent"
                    className="form-input"
                    value={formData.dhlContinent}
                    onChange={(event) => setFormData((previous) => ({ ...previous, dhlContinent: event.target.value, dhlCountry: "", dhlCountryCode: "", dhlState: "" }))}
                    required
                  >
                    <option value="">Select continent or region</option>
                    {dhlContinents.map((continent) => <option key={continent} value={continent}>{continent}</option>)}
                  </select>
                  <select
                    id="dhl-country"
                    className="form-input"
                    value={formData.dhlCountryCode}
                    onChange={(event) => void loadDhlStates(event.target.value)}
                    disabled={!formData.dhlContinent}
                    required
                  >
                    <option value="">Select country</option>
                    {countriesInSelectedContinent.map((country) => (
                      <option key={country.countryCode} value={country.countryCode}>
                        {country.countryName}{country.hasRates ? "" : " — rate not configured"}
                      </option>
                    ))}
                  </select>
                  <select
                    id="dhl-state"
                    className="form-input"
                    value={formData.dhlState}
                    onChange={handleChange("dhlState")}
                    disabled={!formData.dhlCountryCode || dhlStates.length === 0}
                    required
                  >
                    <option value="">Select state, province, or territory</option>
                    {dhlStates.map((state) => (
                      <option key={state.stateName} value={state.stateName} disabled={state.priceKobo === null}>
                        {state.stateName}{state.priceKobo === null ? " — rate not configured" : ` - N${(state.priceKobo / 100).toLocaleString("en-NG")}`}
                      </option>
                    ))}
                  </select>
                  {formData.dhlCountryCode && !dhlCountries.find((country) => country.countryCode === formData.dhlCountryCode)?.hasRates && (
                    <p className="text-xs text-amber-700">DHL delivery is not yet configured for this country. Contact support for a rate.</p>
                  )}
                </div>
              )}
              {selectedDhlRate && selectedDhlRate.priceKobo !== null && (
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  DHL delivery: N{(selectedDhlRate.priceKobo / 100).toLocaleString("en-NG")}
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => selectDeliveryMethod("email")}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Use email instead
              </button>
              <button
                type="button"
                onClick={() => setIsDhlModalOpen(false)}
                disabled={!formData.dhlState || !selectedDhlRate || selectedDhlRate.priceKobo === null || isLoadingDhlRates}
                className="rounded-xl bg-[#173c5c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12314a]"
              >
                Confirm DHL delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
