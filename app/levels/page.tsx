import type { Metadata } from "next";
import Link from "next/link";
import { LevelBadge } from "@/components/level-badge";
import { COMPANY, SITE_NAME } from "@/lib/config";
import { DEFINITIONS, LEVELS } from "@/lib/levels";

export const metadata: Metadata = {
  title: "How levels work",
  description: "The more you contribute to SugarMatch, the more you can do. Here’s how to move up.",
};

const steps = [
  { title: "Add a photo", body: "Upload a clear photo of you. Once a person on our team has approved it, it counts." },
  { title: "Complete your profile", body: `A complete profile has ${DEFINITIONS.completeProfile}.` },
  { title: "Reply to people", body: `A reply is ${DEFINITIONS.reply}. Writing to lots of people without ever answering doesn’t move you up.` },
  { title: "Invite friends who’d like to be here", body: `A friend counts once they’re a real member: ${DEFINITIONS.realMember}. You see how many, never who.` },
];

const faqs = [
  { q: "Is replying ever limited?", a: "No. Replying to someone who has messaged you is always unlimited, at every level. The limits apply to starting new conversations and to liking people." },
  { q: "Why are the limits lower when you start?", a: "It keeps conversations genuine. Members who add a photo, fill in their profile and answer messages make the community better for everyone, so they get more room." },
  { q: "What happens in my first week?", a: "Your first week after you go live counts as Member, so nobody is held back while they set up." },
  { q: "Can I go down a level?", a: "Yes, if the things that earned your level stop being true, for example if you haven’t replied to anyone for a long time. An upheld report about you holds you at Member for 90 days." },
  { q: "Do I have to pay?", a: "No. Everything on this page is earned, not bought. We may add paid options later, and we’ll tell members first. The levels you’ve earned will still count." },
  { q: "What about invites?", a: "Share your link only with people who’d genuinely like to join. Don’t pay, pressure or push anyone, and don’t invite people who have asked you not to. We can remove a level gained through fake or duplicate accounts or invites that break our Terms." },
];

export default function LevelsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="display text-2xl">{SITE_NAME}</Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="btn btn-quiet !py-2 text-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary !py-2 text-sm">Join free</Link>
        </nav>
      </header>

      <main>
        <section className="pb-14 pt-14">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brass">Levels</p>
          <h1 className="display text-[clamp(2.4rem,6vw,4.6rem)]">The more you give, the more you get.</h1>
          <p className="serif-body mt-6 max-w-[52ch] text-xl text-dusk">
            {SITE_NAME} is free, and you earn more room by being a genuine member: a real photo, a complete profile, replies
            to the people who write to you, and friends who join and stay. There are four levels.
          </p>
        </section>

        <section aria-label="The four levels">
          <ol className="grid gap-4 md:grid-cols-4">
            {LEVELS.map((l, i) => (
              <li key={l.tier} className={`flex flex-col rounded-[22px] border p-5 ${l.tier === "champion" ? "border-brass" : "border-line"} bg-velvet`}>
                <div className="flex items-center justify-between">
                  <LevelBadge tier={l.tier} className="size-9" />
                  <span className="text-xs text-dusk">Level {i + 1}</span>
                </div>
                <h2 className="display mt-4 text-3xl">{l.label}</h2>
                <p className="mt-1 text-sm text-dusk">{l.tagline}</p>
                <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-dusk">New conversations a day</dt>
                    <dd className="display text-2xl">{l.conversationsPerDay}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-dusk">Likes an hour</dt>
                    <dd className="display text-2xl">{l.likesPerHour}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-dusk">Replying</dt>
                    <dd>Always unlimited</dd>
                  </div>
                </dl>
                <p className="mt-auto border-t border-line pt-4 text-sm text-dusk">
                  <span className="font-semibold text-pearl">How to reach it: </span>{l.how}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-16" aria-label="How to move up">
          <h2 className="display text-[clamp(2rem,4.5vw,3.2rem)]">How to move up</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line p-5">
                <p className="text-sm font-semibold text-brass">Step {i + 1}</p>
                <h3 className="display mt-1 text-2xl">{s.title}</h3>
                <p className="mt-2 text-dusk">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-dusk">
            Once you’re a member, your level and your personal invite link are under <strong className="text-pearl">More</strong> in the app.
          </p>
        </section>

        <section className="border-t border-line py-14" aria-label="Questions">
          <h2 className="display text-[clamp(2rem,4.5vw,3.2rem)]">Questions, answered plainly</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="text-2xl text-brass transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-[64ch] text-dusk">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pb-16 text-center">
          <h2 className="display text-[clamp(2rem,4.5vw,3.2rem)]">Ready to start?</h2>
          <p className="mx-auto mt-3 max-w-[44ch] text-dusk">Joining is free. You’ll be a Newcomer with Member limits for your first week.</p>
          <Link href="/signup" className="btn btn-primary mt-7">Create your free profile</Link>
        </section>
      </main>

      <footer className="border-t border-line pt-8 pb-10 text-sm text-dusk">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-pearl">Terms</Link>
          <Link href="/privacy" className="hover:text-pearl">Privacy</Link>
          <Link href="/safety" className="hover:text-pearl">Safety</Link>
          <a href={`mailto:${COMPANY.email}`} className="hover:text-pearl">Contact</a>
        </nav>
      </footer>
    </div>
  );
}
