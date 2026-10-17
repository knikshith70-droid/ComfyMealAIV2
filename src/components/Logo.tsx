export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 112" className={className} fill="none" role="img" aria-label="ComfyMeal AI logo">
      <path d="M58 8 62 20 74 24 62 28 58 40 54 28 42 24 54 20 58 8Z" fill="#0784D5" />
      <circle cx="34" cy="25" r="2.5" fill="#0784D5" />
      <circle cx="82" cy="21" r="2.5" fill="#0784D5" />
      <path d="M22 64c1-17 15-30 31-30 10 0 18 5 24 13 6-7 13-11 21-11 13 0 23 10 24 23-8 7-19 10-34 10H38c-6 0-11-2-16-5Z" fill="#FFFDF7" stroke="#0784D5" strokeWidth="3.5" />
      <path d="M36 52c-4 0-6 4-6 7m18-14-5 8m17-13-7 12m21-11-8 13" stroke="#F7BD28" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M71 48c7-13 17-21 28-23-1 13-8 23-18 29M82 51c10-10 22-14 31-12-4 12-13 19-26 21" fill="#56A85D" stroke="#398D48" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 63h93c-3 24-20 38-46 38S22 87 18 63Z" fill="#0879CC" />
      <path d="M18 63h93c-3 24-20 38-46 38S22 87 18 63Z" stroke="#0879CC" strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 70h17l11 11h21l10 10h18" stroke="#0784D5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 83h18l8 8h15l10 10h8" stroke="#0784D5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="70" r="3.2" fill="#FFFDF7" stroke="#0784D5" strokeWidth="3" />
      <circle cx="5" cy="83" r="3.2" fill="#FFFDF7" stroke="#0784D5" strokeWidth="3" />
      <circle cx="86" cy="91" r="3.4" fill="#FFFDF7" stroke="#0784D5" strokeWidth="3" />
      <path d="M40 105h42" stroke="#153D70" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none tracking-tight ${className}`}>
      <span className="whitespace-nowrap text-xl font-semibold sm:text-2xl">
        <span style={{ color: "#153D70" }}>Comfy</span><span style={{ color: "#F4BD2D" }}>Meal</span><span style={{ color: "#0784D5" }}> AI</span>
      </span>
      <span className="mt-1.5 whitespace-nowrap text-[8px] font-semibold tracking-[0.19em] text-[#0879CC] sm:text-[9px]">SMART MEALS. MADE EASY.</span>
    </span>
  );
}
