// Shown next to a member's name once they've passed the age check. It means the age check, not a check of who they are.
export function AgeBadge({ className = "size-4" }: { className?: string }) {
  return (
    <span role="img" aria-label="Age verified" title="Age verified" className="inline-flex shrink-0 text-brass">
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <circle cx="8" cy="8" r="8" fill="currentColor" />
        <path d="M4.6 8.2l2.2 2.2 4.4-4.6" stroke="var(--night)" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
