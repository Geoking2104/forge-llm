export function ForgeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-primary" />
      <rect x="7" y="18" width="4.5" height="7" rx="1" className="fill-primary-fg/40" />
      <rect x="13.75" y="12" width="4.5" height="13" rx="1" className="fill-primary-fg/70" />
      <rect x="20.5" y="7" width="4.5" height="18" rx="1" className="fill-primary-fg" />
    </svg>
  );
}
