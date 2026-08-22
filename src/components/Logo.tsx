export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-sage-600" />
      <path
        d="M20 40c0-8 6-14 12-14s12 6 12 14"
        className="stroke-cream-50"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="22" r="4.5" className="fill-clay-400" />
      <path d="M32 17.5V14" className="stroke-clay-400" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-xl tracking-tight text-charcoal-900 ${className}`}>
      ComfyMeal <span className="text-sage-600">AI</span>
    </span>
  );
}
