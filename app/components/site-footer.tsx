export default function SiteFooter() {
  return (
    <footer className="site-footer border-t border-slate-200 bg-white/95 px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="text-[10px] leading-4 text-slate-500 sm:text-xs">
          Transcript processing, approval, fees, and delivery are subject to the institution&apos;s policies and procedures.
        </p>
        <div className="flex shrink-0 items-center gap-2.5" aria-label="Raycom Global Tech Hub">
          <svg className="h-9 w-10 shrink-0" viewBox="0 0 48 42" role="img" aria-label="Raycom logo">
            <defs>
              <linearGradient id="raycom-blue" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#11b5ed" />
                <stop offset="100%" stopColor="#0756c7" />
              </linearGradient>
            </defs>
            <text x="2" y="34" fill="url(#raycom-blue)" fontFamily="Arial, sans-serif" fontSize="39" fontWeight="900" fontStyle="italic">R</text>
            <path d="M19 37c10-1 22-7 26-14 2-4-1-7-7-8 10 0 14 5 10 11-5 7-18 12-29 13Z" fill="#0756c7" />
          </svg>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-xs font-bold tracking-tight text-slate-800 sm:text-sm">Raycom Global Tech Hub</span>
            <span className="mt-0.5 text-[8px] font-semibold tracking-[0.22em] text-blue-600 sm:text-[9px]">BUILDING DIGITAL SOLUTIONS</span>
          </span>
        </div>
      </div>
    </footer>
  );
}