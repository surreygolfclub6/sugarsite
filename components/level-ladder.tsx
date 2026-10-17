import { DEFINITIONS, LEVELS, whatYouGet, type Level, type Progress } from "@/lib/levels";
import { LevelBadge } from "@/components/level-badge";

function Line({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {done === undefined ? (
        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-dusk" />
      ) : (
        <span aria-hidden className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[10px] ${done ? "border-brass bg-brass text-night" : "border-line-strong text-transparent"}`}>✓</span>
      )}
      <span className={done ? "text-dusk" : ""}>
        {children}
        {done !== undefined && <span className="sr-only">{done ? " (done)" : " (to do)"}</span>}
      </span>
    </li>
  );
}

// What it takes to reach a level, with each part ticked off against the member's own progress when we have it.
function Requirements({ level, progress }: { level: Level; progress?: Progress }) {
  if (level.tier === "newcomer") return <p className="text-sm">{level.how}</p>;
  const m = progress?.metrics;
  return (
    <ul className="space-y-2">
      <Line done={m?.has_photo}>An approved photo (public or private)</Line>
      <Line done={m?.profile_ok}>A complete profile</Line>
      <Line done={m ? m.conversations >= level.minConversations : undefined}>
        {level.minConversations} conversations{m ? ` (${Math.min(m.conversations, level.minConversations)} so far)` : ""}
      </Line>
      {level.minFriends > 0 && (
        <Line done={m ? m.referrals_qualified >= level.minFriends : undefined}>
          {level.minFriends} invited {level.minFriends === 1 ? "friend" : "friends"} who {level.minFriends === 1 ? "has" : "have"} become real {level.minFriends === 1 ? "a member" : "members"}
          {m ? ` (${Math.min(m.referrals_qualified, level.minFriends)} so far)` : ""}
        </Line>
      )}
      {level.needsResponseRecord && <Line done={m?.responsive}>A good response record</Line>}
    </ul>
  );
}

// The full list of levels. With a member's progress it shows where they are and what's left; without, it's the plain guide.
export function LevelLadder({ progress }: { progress?: Progress }) {
  return (
    <ol className="space-y-4" aria-label="All levels">
      {LEVELS.map((level, i) => {
        const rank = i + 1;
        const current = progress?.rank === rank;
        const reached = !!progress && rank < progress.rank;
        return (
          <li
            key={level.tier}
            aria-current={current ? "step" : undefined}
            className={`rounded-2xl border bg-velvet p-5 ${current ? "border-brass" : "border-line"}`}
          >
            <div className="flex items-center gap-3">
              <LevelBadge tier={level.tier} className="size-9" />
              <div className="min-w-0">
                <h3 className="display text-2xl">{level.label}</h3>
                <p className="text-sm text-dusk">{level.tagline}</p>
              </div>
              {current && <span className="ml-auto shrink-0 rounded-full bg-brass px-2.5 py-0.5 text-xs font-medium text-night">You are here</span>}
              {reached && <span className="ml-auto shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-dusk">Reached</span>}
            </div>
            <div className="mt-5 grid gap-5 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dusk">What you get</p>
                <ul className="space-y-2">
                  {whatYouGet(level).map((line) => (
                    <Line key={line}>{line}</Line>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dusk">How to get there</p>
                <Requirements level={level} progress={progress} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// "How it's counted": the plain-language definitions behind the requirements.
export function LevelDefinitions() {
  const items: [string, string][] = [
    ["An approved photo", `is ${DEFINITIONS.photo}.`],
    ["A complete profile", `has ${DEFINITIONS.completeProfile}.`],
    ["A conversation", `is ${DEFINITIONS.conversation}.`],
    ["A good response record", `means ${DEFINITIONS.responseRecord}.`],
    ["A match", `is ${DEFINITIONS.match}.`],
    ["A real member (an invited friend who counts)", `is ${DEFINITIONS.realMember}.`],
  ];
  return (
    <dl className="space-y-3 text-sm">
      {items.map(([term, text]) => (
        <div key={term}>
          <dt className="inline font-semibold">{term} </dt>
          <dd className="inline text-dusk">{text}</dd>
        </div>
      ))}
    </dl>
  );
}
