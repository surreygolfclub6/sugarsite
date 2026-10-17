import type { TierKey } from "@/lib/levels";

const STYLE: Record<TierKey, { colour: string; filled: boolean }> = {
  newcomer: { colour: "text-dusk", filled: false },
  member: { colour: "text-garnet", filled: true },
  trusted: { colour: "text-brass", filled: true },
  champion: { colour: "text-brass", filled: true },
};

// The badge for a level: a shield that fills in and gains a symbol as members move up.
export function LevelBadge({ tier, className = "size-6" }: { tier: TierKey; className?: string }) {
  const { colour, filled } = STYLE[tier];
  return (
    <span role="img" aria-label={`${tier} level`} className={`inline-flex shrink-0 ${colour}`}>
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M12 2.5 4 5.8v6c0 4.7 3.3 8 8 9.7 4.7-1.7 8-5 8-9.7v-6z"
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {tier === "member" && <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
        {tier === "trusted" && (
          <path d="M12 16.2s-3.6-2.2-4.6-4.4C6.7 10.2 7.7 8.7 9.3 8.7c1 0 1.9.5 2.7 1.4.8-.9 1.7-1.4 2.7-1.4 1.6 0 2.6 1.5 1.9 3.1-1 2.2-4.6 4.4-4.6 4.4z" fill="var(--night)" />
        )}
        {tier === "champion" && (
          <path d="m12 7.6 1.5 3.1 3.4.5-2.5 2.4.6 3.4L12 15.4l-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="var(--night)" />
        )}
      </svg>
    </span>
  );
}
