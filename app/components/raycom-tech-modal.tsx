"use client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpenLiveChat?: () => void;
};

export default function RaycomTechModal({ isOpen, onClose, onOpenLiveChat }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="raycom-modal-title"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#122b25] via-[#173d35] to-[#25574c] px-6 py-6 text-white sm:px-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold shadow-inner border border-white/10">
                🌐
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a5cca0]">
                  Parent Innovation Ecosystem
                </span>
                <h2 id="raycom-modal-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Raycom Global Tech Hub
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 max-w-xl text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Pioneering digital transformation across education, academic credentials, automation, and enterprise software solutions across Africa and global markets.
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8 text-slate-700">
          {/* About Section */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">About Our Company</h3>
            <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-slate-600">
              <strong className="text-slate-900">Raycom Global Tech Hub</strong> is a premier technology powerhouse dedicated to engineering scalable, secure, and modern digital ecosystems. We bridge universities, corporate institutions, and global alumni with intelligent software platforms that eliminate institutional bureaucracy and enhance verification transparency.
            </p>
          </section>

          {/* Core Products Grid */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Our Signature Products</h3>
            <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-xs">🎓</span>
                  <span>TranscriptPoint™</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Automated end-to-end credential clearinghouse enabling students and alumni to order official degree transcripts, English proficiency documents, and international DHL deliveries in two weeks+.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 text-xs">⚡</span>
                  <span>Raycom Cloud Campus</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Next-generation student information &amp; records management system empowering academic institutions with automated grading, real-time registrar processing, and verifiable e-transcripts.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-800 text-xs">🔐</span>
                  <span>Raycom TrustVerify</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Instant tamper-proof certificate and document authentication portal using cryptographic hashing and verified university registries to mitigate credential forgery worldwide.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs">🚚</span>
                  <span>Express Dispatch Logistics Hub</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Integrated multi-zone courier delivery network seamlessly connected with DHL Express and domestic dispatch services for door-to-door hardcopy package tracking and delivery verification.
                </p>
              </div>
            </div>
          </section>

          {/* Contact & Support Section */}
          <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#173d35]">Need Assistance or Enterprise Collaboration?</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Our engineering and customer success teams are available around the clock to support students, alumni, and partner academic institutions.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLiveChat?.();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#22574b]"
              >
                <span>💬</span>
                <span>Open Chat with Support</span>
              </button>
              <a
                href="mailto:support@transcriptpoint.com"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span>✉️</span>
                <span>Email Official Help Desk</span>
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center sm:px-8">
          <p className="text-[11px] text-slate-500">
            Raycom Global Tech Hub © {new Date().getFullYear()} • TranscriptPoint Academic Services
          </p>
        </div>
      </div>
    </div>
  );
}
