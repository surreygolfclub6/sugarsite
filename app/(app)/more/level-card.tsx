import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/config";
import { CopyLink } from "@/components/copy-link";
import { LevelBadge } from "@/components/level-badge";
import { isUnlimited, perDayText, type Progress } from "@/lib/levels";

function Step({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span
        aria-hidden
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${done ? "border-brass bg-brass text-night" : "border-line-strong text-transparent"}`}
      >
        ✓
      </span>
      <span className={done ? "text-dusk" : ""}>
        {children}
        <span className="sr-only">{done ? " (done)" : " (to do)"}</span>
      </span>
    </li>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-dusk transition-transform group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const summary =
  "flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden";

// "Your level": where the member stands, what's left to do for the next level, and their personal invite link.
export async function LevelCard({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data }, { data: me }] = await Promise.all([
    supabase.rpc("my_progress"),
    // The invite code isn't readable through the API (so nobody can list other members' codes); read your own here.
    createAdminClient()
      .from("profiles")
      .select("status, referral_code")
      .eq("id", userId)
      .single(),
  ]);
  const pr = data as Progress | null;
  if (!pr || !me || me.status !== "active") return null;

  const m = pr.metrics;
  const next = pr.next;
  const used = Math.min(pr.started_today, pr.daily_conversations);
  const link = `${SITE_URL}/join?ref=${me.referral_code}`;

  return (
    <section aria-label="Your level" className="mb-3 space-y-3">
      <details className="group rounded-xl border border-brass/60 bg-velvet">
        <summary className={`${summary} px-4 py-3`}>
          <LevelBadge tier={pr.tier} className="size-9" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] uppercase tracking-[0.14em] text-dusk">
              Your level
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="display text-xl">{pr.label}</h2>
              <span className="text-xs text-dusk">
                {isUnlimited(pr.daily_conversations)
                  ? "Unlimited new conversations"
                  : `${used} of ${pr.daily_conversations} new conversations today`}
              </span>
            </span>
          </span>
          <Chevron />
        </summary>
        <div className="border-t border-line p-5 pt-4">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span>New conversations today</span>
              <span className="text-dusk">
                {isUnlimited(pr.daily_conversations) ? `${pr.started_today} started, no limit` : `${used} of ${pr.daily_conversations}`}
              </span>
            </div>
            {!isUnlimited(pr.daily_conversations) && <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={pr.daily_conversations}
              aria-valuenow={used}
              aria-label="New conversations used today"
            >
              <div
                className="h-full rounded-full bg-garnet"
                style={{ width: `${(used / pr.daily_conversations) * 100}%` }}
              />
            </div>}
            <p className="mt-2 text-xs text-dusk">
              Replying to people who message you, and messaging a match, never
              uses these up.
            </p>
          </div>

          {pr.in_grace && (
            <p className="mt-4 rounded-xl border border-line px-3 py-2 text-xs text-dusk">
              It’s your first week, so you have Member limits while you settle
              in.
            </p>
          )}
          {pr.upheld_reports > 0 && pr.rank >= 2 && (
            <p className="mt-4 rounded-xl border border-line px-3 py-2 text-xs text-dusk">
              A recent report about you was upheld, so your level is held at
              Member for now.
            </p>
          )}

          {next ? (
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold">Next: {next.label}</p>
              <p className="mt-1 text-xs text-dusk">
                You’d get {perDayText(next.daily_conversations).toLowerCase()} and
                a {next.label} badge.
              </p>
              <ul className="mt-4 space-y-3">
                {next.min_referrals > 0 && (
                  <Step done={m.referrals_qualified >= next.min_referrals}>
                    Invite {next.min_referrals}{" "}
                    {next.min_referrals === 1 ? "friend" : "friends"} who become
                    real members (
                    {Math.min(m.referrals_qualified, next.min_referrals)} so
                    far)
                  </Step>
                )}
                {next.needs_photo && (
                  <Step done={m.has_photo}>
                    Get a photo approved, public or private (
                    <Link
                      href="/photos"
                      className="underline underline-offset-2"
                    >
                      add or replace photos
                    </Link>
                    )
                  </Step>
                )}
                {next.needs_profile && (
                  <Step done={m.profile_ok}>
                    Complete your profile (
                    <Link
                      href="/more/profile"
                      className="underline underline-offset-2"
                    >
                      edit profile
                    </Link>
                    )
                  </Step>
                )}
                {next.min_conversations > 0 && (
                  <Step done={m.conversations >= next.min_conversations}>
                    Have {next.min_conversations} conversations or matches (
                    {Math.min(m.conversations, next.min_conversations)} so far)
                  </Step>
                )}
                {next.needs_responsive && (
                  <Step done={m.responsive}>
                    Keep a good response record: answer at least half of the
                    people who write to you first
                  </Step>
                )}
              </ul>
            </div>
          ) : (
            <p className="mt-6 border-t border-line pt-5 text-sm text-dusk">
              You’ve reached the top level. Thank you for helping SugarMatch
              thrive.
            </p>
          )}
          <p className="mt-5 text-sm">
            <Link
              href="/more/levels"
              className="text-brass underline underline-offset-2"
            >
              See all levels and what they unlock
            </Link>
          </p>
        </div>
      </details>

      <details className="group rounded-xl border border-line">
        <summary className={`${summary} px-4 py-4 hover:bg-velvet`}>
          <h2 className="flex-1">Invite friends</h2>
          <Chevron />
        </summary>
        <div className="border-t border-line p-5 pt-4">
          <p className="text-sm text-dusk">
            This is your personal link. When a friend joins through it, passes
            the age check, completes their profile and has been a member for a
            week, they count towards your next level. You’ll see how many, never
            who.
          </p>
          <div className="mt-4">
            <CopyLink url={link} shareText="Come and join me on SugarMatch." />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-line px-3 py-2.5">
              <dt className="text-xs text-dusk">Joined with your link</dt>
              <dd className="display text-2xl">{m.referrals_joined}</dd>
            </div>
            <div className="rounded-xl border border-line px-3 py-2.5">
              <dt className="text-xs text-dusk">Now real members</dt>
              <dd className="display text-2xl">{m.referrals_qualified}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-dusk">
            Please only invite people who’d like to be here. Don’t pay, pressure
            or push anyone to join.
          </p>
        </div>
      </details>
    </section>
  );
}
