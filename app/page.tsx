import Link from "next/link";
import { COMPANY, SITE_NAME } from "@/lib/config";
import { AgeBadge } from "@/components/age-badge";
import { LevelBadge } from "@/components/level-badge";
import { LEVELS } from "@/lib/levels";
import { ProfileCarousel } from "@/components/profile-carousel";
import { HomeImage } from "./home-image";
import { FinalCta, HeaderActions, HeroActions } from "./home-session";

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="7" fill="var(--brass)" />
      <path d="M4 7.2l2 2L10 5" stroke="var(--night)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tick() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-1 shrink-0">
      <path d="M3 8.4l3.2 3.2L13 4.8" stroke="var(--brass)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-1 shrink-0">
      <path d="M4 4l8 8M12 4l-8 8" stroke="var(--dusk)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Examples of how members describe themselves. Invented, and labelled as examples on the page. Elena uses
// hero.jpg; for the others, drop a photo named profile-<slug>.jpg into public/images/home and it replaces the gradient.
const exampleProfiles = [
  {
    slug: "elena",
    image: "hero.jpg",
    alt: "A woman seated at a restaurant table as her date arrives",
    name: "Elena",
    age: 29,
    city: "London",
    headline: "Between projects and travelling a lot. I like good dinners and someone who’s easy to talk to.",
    looking: "A relationship with clear expectations, discretion on both sides, and time together that suits two busy diaries.",
    goals: ["Long-term", "Casual dating"],
  },
  {
    slug: "marcus",
    name: "Marcus",
    age: 41,
    city: "Manchester",
    headline: "Founder, always between flights. Slow Sundays when I’m home.",
    looking: "Someone independent and curious. Time together that suits two busy diaries, with no mixed signals.",
    goals: ["Long-term", "Friendship"],
  },
  {
    slug: "priya",
    name: "Priya",
    age: 34,
    city: "Birmingham",
    headline: "A surgeon who cooks better than she sleeps.",
    looking: "Honesty up front. Dinners, theatre and the odd weekend away with someone who’s easy to talk to.",
    goals: ["Long-term", "Casual dating"],
  },
  {
    slug: "james",
    name: "James",
    age: 52,
    city: "Edinburgh",
    headline: "Recently single, quietly confident, better company than I look.",
    looking: "Good conversation and companionship. Discretion on both sides, and clear expectations from day one.",
    goals: ["Friendship", "Not sure yet"],
  },
  {
    slug: "chloe",
    name: "Chloe",
    age: 27,
    city: "Bristol",
    headline: "Designer, paddleboarder, planner of far-too-many trips.",
    looking: "Someone established and kind who knows what they want, and says so. I’d rather be direct than guess.",
    goals: ["Casual dating", "Marriage minded"],
  },
];

function ExampleCard({ p, index }: { p: (typeof exampleProfiles)[number]; index: number }) {
  return (
    <li
      className={`flex w-[calc(100%-2.25rem)] max-w-sm shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border border-line bg-velvet shadow-[0_30px_80px_-40px_rgba(0,0,0,0.55)] sm:w-80 lg:w-auto lg:max-w-none ${
        // Everyone scrolls on small screens; two show side by side from 1024px and three from 1280px.
        index === 2 ? "lg:hidden xl:flex" : index > 2 ? "lg:hidden" : ""
      }`}
    >
      <div className="relative">
        <HomeImage
          name={"image" in p && p.image ? p.image : `profile-${p.slug}.jpg`}
          alt={"alt" in p && p.alt ? p.alt : `${p.name}, an example member`}
          sizes="(min-width: 1280px) 260px, (min-width: 1024px) 340px, 90vw"
          priority={index === 0}
          tone={index}
          initial={p.name.slice(0, 1)}
          className="aspect-[4/4.2]"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(22,15,24,0.92) 0%, rgba(22,15,24,0) 55%)" }}
        />
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <p className="display flex items-center gap-2 text-3xl">
            {p.name}, {p.age} <AgeBadge className="size-5" />
          </p>
          <p className="text-sm text-white/75">{p.city}</p>
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs text-white/85 backdrop-blur">
          Example profile
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="serif-body italic text-pearl/90">“{p.headline}”</p>
        <div className="mt-auto border-t border-line pt-4">
          <p className="text-sm font-semibold text-brass">What I’m looking for</p>
          <p className="mt-1 text-sm text-dusk">{p.looking}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Relationship goals">
            {p.goals.map((g) => (
              <li key={g} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-dusk">
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

const steps = [
  {
    n: "01",
    title: "Write your terms",
    body: "Say who you are and what you’re after in your own words: the kind of relationship, how much time you have, what matters to you. No guessing games, no decoding.",
    image: "step-1.jpg",
    alt: "A restaurant table set for two, with a glowing lamp and an orchid",
  },
  {
    n: "02",
    title: "Meet people who agree",
    body: "Search by age, distance and what people are looking for, so the profiles you see already want something compatible. Like someone, or just say hello.",
    image: "step-2.jpg",
    alt: "A couple laughing together on a wooden bench",
  },
  {
    n: "03",
    title: "Take it at your pace",
    body: "Talk in private, block anyone in two taps, and only meet when you’re ready. Nobody is hurrying you, and nothing sits behind a paywall to slow you down.",
    image: "step-3.jpg",
    alt: "Two people holding hands as they walk through an underpass at night",
  },
];

const features = [
  {
    title: "Honest profiles",
    body: "A dedicated space to state what you’re looking for, shown on your profile and in search, so the right people find you.",
  },
  {
    title: "Photos checked by a person",
    body: "Every photo is reviewed by a human before anyone else can see it. Fake and stolen pictures don’t make it through.",
  },
  {
    title: "Private by design",
    body: "Your exact location is never shown, only a rounded distance. Photos are scrubbed of hidden metadata before they’re uploaded.",
  },
  {
    title: "Live messaging",
    body: "Messages arrive instantly, with sent and read receipts, so you’re never left wondering whether someone saw yours.",
  },
  {
    title: "Real moderation",
    body: "Report a profile or a conversation and a moderator reviews it. Suspected under-18s are looked at first, and repeat offenders are banned.",
  },
  {
    title: "Your data, your call",
    body: "Download everything we hold about you, or delete your account, whenever you like. No emails to chase.",
  },
];

const faqs = [
  {
    q: `Is ${SITE_NAME} really free?`,
    a: "Yes. Joining is free, and at launch there is no subscription between you and a conversation. If we ever add paid features, we’ll tell members first and the basics, like creating a profile and replying to messages, will stay free.",
  },
  {
    q: "What kind of relationships is this for?",
    a: "Whatever two consenting adults agree on, as long as they say so openly. Some members want a traditional partner, others want something more flexible. The point is that you state it up front.",
  },
  {
    q: "How does age verification work?",
    a: "When you join, we send you to AgeVerif, an independent age-checking service, to confirm you’re 18 or over. Depending on what you choose it can estimate your age from a selfie or check an ID, and it usually takes about a minute. AgeVerif tells us only the result. We don’t see or keep your photo or ID. Until you pass, your profile stays hidden and you can’t see other members.",
  },
  {
    q: "What does the Age verified badge mean?",
    a: "It means a member passed an age check confirming they’re an adult. It doesn’t confirm who they are, so it’s one part of staying safe, not a guarantee. Our safety page explains how to take care when you chat and meet.",
  },
  {
    q: "How do you keep it safe?",
    a: "Every member is age-verified, every photo is reviewed by a person before it’s visible, and you can block or report anyone from any profile or chat. Reports go to real moderators.",
  },
  {
    q: "Is anything off limits?",
    a: "Yes. We don’t allow, and will remove, anything that offers or requests sexual services for payment. It’s a dating site, and accounts that break this rule are banned.",
  },
  {
    q: "Who can see my profile?",
    a: "Only signed-in members who match your preferences. Your exact location is never shown, and you can block anyone, which hides you from each other completely.",
  },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="display text-2xl">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <a href="#how" className="hidden px-3 text-sm text-dusk hover:text-pearl sm:block">
            How it works
          </a>
          <a href="#verified" className="hidden px-3 text-sm text-dusk hover:text-pearl md:block">
            Age verified
          </a>
          <a href="#levels" className="hidden px-3 text-sm text-dusk hover:text-pearl md:block">
            Levels
          </a>
          <a href="#why" className="hidden px-3 text-sm text-dusk hover:text-pearl sm:block">
            Why {SITE_NAME}
          </a>
          <HeaderActions />
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[0.8fr_1.4fr] lg:items-center lg:gap-14 lg:pt-20">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
              Dating, on clear terms
            </p>
            <h1 className="display text-[clamp(2.9rem,8vw,6.2rem)] lg:text-[clamp(3rem,4.6vw,5.4rem)]">
              Say what you’re looking for.
            </h1>
            <p className="serif-body mt-7 max-w-[36ch] text-xl text-dusk sm:text-2xl">
              Meet adults who’d rather be direct about the relationship they want, without paying
              a fortune just to send a message.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <HeroActions />
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-dusk">
              <li className="flex items-center gap-2"><Check /> Free to join</li>
              <li className="flex items-center gap-2"><Check /> Every member age-verified</li>
              <li className="flex items-center gap-2"><Check /> Every photo reviewed</li>
            </ul>
            <p className="mt-5 text-sm text-dusk">18 and over only.</p>
          </div>

          {/* Sample profiles: show the product's one idea, a profile that states its terms. */}
          <div className="rise min-w-0">
            <ProfileCarousel label="Example profiles">
              {exampleProfiles.map((p, i) => (
                <ExampleCard key={p.slug} p={p} index={i} />
              ))}
            </ProfileCarousel>
          </div>
        </section>

        {/* Why: the price story, said gently */}
        <section id="why" className="border-t border-line bg-velvet/50">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="display text-[clamp(2rem,5vw,3.4rem)]">
                Honest dating shouldn’t come with a monthly bill.
              </h2>
              <p className="serif-body mt-6 text-lg text-dusk">
                Most sites in this space make money by keeping you locked out: pay to read your
                messages, pay to reply, pay to be seen. The people who most want to be direct end
                up paying the most to find someone who is.
              </p>
              <p className="serif-body mt-4 text-lg text-dusk">
                {SITE_NAME} was built the other way round. Clear profiles, real people and
                private conversation, with the basics free at launch, so the only thing between you
                and a good conversation is saying hello.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[18px] border border-line p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-dusk">The usual way</p>
                <ul className="mt-4 space-y-3 text-dusk">
                  <li className="flex gap-3"><Cross /> Pay to read or answer a message</li>
                  <li className="flex gap-3"><Cross /> Vague profiles and mixed signals</li>
                  <li className="flex gap-3"><Cross /> Fake photos, spam accounts and no age checks</li>
                  <li className="flex gap-3"><Cross /> A subscription you have to remember to cancel</li>
                </ul>
              </div>
              <div className="rounded-[18px] border border-brass/50 bg-velvet p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-brass">{SITE_NAME}</p>
                <ul className="mt-4 space-y-3">
                  <li className="flex gap-3"><Tick /> Free to join and free to message, with more room as you contribute</li>
                  <li className="flex gap-3"><Tick /> Profiles that state what you want</li>
                  <li className="flex gap-3"><Tick /> Every member age-verified, every photo reviewed</li>
                  <li className="flex gap-3"><Tick /> No card needed, nothing to cancel</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Age verification */}
        <section id="verified" className="border-t border-line">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-20">
              <div>
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brass">
                  <AgeBadge className="size-5" /> Age verified
                </p>
                <h2 className="display text-[clamp(2rem,5vw,3.4rem)]">Every member is checked to be an adult.</h2>
                <p className="serif-body mt-6 text-lg text-dusk">
                  Before a profile goes live, each member passes an independent age check run by AgeVerif. It takes about
                  a minute, and it can estimate your age from a selfie or check an ID.
                </p>
                <p className="serif-body mt-4 text-lg text-dusk">
                  Until someone has passed, their profile stays hidden and they can’t see anyone else. Members who pass
                  show the badge on their profile and in search.
                </p>
              </div>

              <ul className="space-y-4">
                <li className="rounded-[18px] border border-line p-6">
                  <h3 className="display text-2xl">Quick, and kept private</h3>
                  <p className="mt-2 text-dusk">
                    AgeVerif tells us only the result. We never see or keep your photo or ID.
                  </p>
                </li>
                <li className="rounded-[18px] border border-line p-6">
                  <h3 className="display text-2xl">One check, one account</h3>
                  <p className="mt-2 text-dusk">
                    A single age check can only back one profile, which makes it much harder to run fake or duplicate accounts.
                  </p>
                </li>
                <li className="rounded-[18px] border border-line p-6">
                  <h3 className="display text-2xl">An honest badge</h3>
                  <p className="mt-2 text-dusk">
                    It confirms a member is an adult, not who they are, so it’s one part of staying safe. Read our{" "}
                    <Link href="/safety" className="text-pearl underline underline-offset-2">safety tips</Link>.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Levels */}
        <section id="levels" className="border-t border-line bg-velvet/50">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brass">Levels</p>
              <h2 className="display text-[clamp(2rem,5vw,3.4rem)]">The more you give, the more you get.</h2>
              <p className="serif-body mt-6 text-lg text-dusk">
                {SITE_NAME} is free, and you earn more room by being a genuine member: a real photo, a complete profile,
                replies to the people who write to you, and friends who join and stay. No payments, no gimmicks.
              </p>
            </div>

            <ol className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {LEVELS.map((l, i) => (
                <li key={l.tier} className={`flex flex-col rounded-[22px] border bg-velvet p-6 ${l.tier === "champion" ? "border-brass" : "border-line"}`}>
                  <div className="flex items-center justify-between">
                    <LevelBadge tier={l.tier} className="size-10" />
                    <span className="text-xs text-dusk">Level {i + 1}</span>
                  </div>
                  <h3 className="display mt-4 text-3xl">{l.label}</h3>
                  <p className="mt-1 text-sm text-dusk">{l.tagline}</p>
                  <p className="mt-5 border-t border-line pt-4">
                    <span className="display text-4xl">{l.conversationsPerDay}</span>
                    <span className="ml-2 text-sm text-dusk">new conversations a day</span>
                  </p>
                  <p className="mt-3 text-sm text-dusk">{l.how}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-[60ch] text-dusk">
                Replying to someone who messages you is always unlimited. Every member also gets a personal invite link:
                when friends join and become real members, you move up.
              </p>
              <Link href="/levels" className="btn btn-quiet shrink-0">See how levels work</Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-line">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
            <h2 className="display max-w-[18ch] text-[clamp(2rem,5vw,3.4rem)]">
              Three steps from hello to something real.
            </h2>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {steps.map((s) => (
                <article key={s.n}>
                  <HomeImage
                    name={s.image}
                    alt={s.alt}
                    sizes="(min-width: 768px) 360px, 90vw"
                    tone={Number(s.n)}
                    className="aspect-[4/3] rounded-[18px] border border-line"
                  />
                  <p className="mt-6 text-sm font-semibold text-brass">{s.n}</p>
                  <h3 className="display mt-1 text-2xl">{s.title}</h3>
                  <p className="mt-3 max-w-[40ch] text-dusk">{s.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-line bg-velvet/50">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
            <h2 className="display max-w-[20ch] text-[clamp(2rem,5vw,3.4rem)]">
              Built for people who value their time and their privacy.
            </h2>
            <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="border-t border-line pt-6">
                  <h3 className="display text-2xl">{f.title}</h3>
                  <p className="mt-3 max-w-[38ch] text-dusk">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8">
            <h2 className="display text-[clamp(2rem,5vw,3.2rem)]">Questions, answered plainly.</h2>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {faqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="text-2xl text-brass transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[60ch] text-dusk">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8">
            <div className="relative isolate overflow-hidden rounded-[26px] border border-line">
              <HomeImage
                name="cta.jpg"
                alt=""
                sizes="(min-width: 1152px) 1100px, 100vw"
                tone={2}
                className="absolute inset-0 -z-10"
              />
              <div className="absolute inset-0 -z-10 bg-night/70" />
              <div className="px-6 py-16 text-center sm:px-12 sm:py-24">
                <h2 className="display mx-auto max-w-[18ch] text-[clamp(2.2rem,6vw,4rem)]">
                  Your next conversation is one honest sentence away.
                </h2>
                <p className="serif-body mx-auto mt-5 max-w-[44ch] text-lg text-pearl/80">
                  Set up your profile in a few minutes. It’s free, and you decide who sees it.
                </p>
                <FinalCta />
                <p className="mt-4 text-sm text-pearl/70">18 and over only.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-10 text-sm text-dusk sm:px-8 md:flex-row md:items-start md:justify-between">
          <p className="max-w-[60ch]">
            {SITE_NAME} is for adults aged 18 and over. We don’t allow, and will remove,
            anything that offers or requests sexual services for payment.
          </p>
          <p className="max-w-[40ch] text-xs">
            Place data from{" "}
            <a href="https://www.geonames.org" className="underline hover:text-pearl">GeoNames</a>, licensed under{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" className="underline hover:text-pearl">CC BY 4.0</a>.
          </p>
          <nav className="flex gap-5 md:shrink-0">
            <Link href="/terms" className="hover:text-pearl">Terms</Link>
            <Link href="/privacy" className="hover:text-pearl">Privacy</Link>
            <Link href="/safety" className="hover:text-pearl">Safety</Link>
            <a href={`mailto:${COMPANY.email}`} className="hover:text-pearl">Contact</a>
          </nav>
        </div>
        <p className="mx-auto w-full max-w-7xl px-5 pb-10 text-xs text-dusk sm:px-8">
          Photos, cropped: “Couple enjoys a meal at a restaurant” and “A young couple sits closely on a wooden bench” by{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Couple_enjoys_a_meal_at_a_restaurant_with_attentive_interaction.jpg" className="underline hover:text-pearl">Shixart1985</a>
          {" "}(<a href="https://creativecommons.org/licenses/by/2.0/" className="underline hover:text-pearl">CC BY 2.0</a>); “Walking together, Boulevard de Nantes subway, Cardiff” by{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Walking_together_Boulevard_de_Nantes_subway,_Cardiff_(46626750612).jpg" className="underline hover:text-pearl">Jeremy Segrott</a>
          {" "}(<a href="https://creativecommons.org/licenses/by/2.0/" className="underline hover:text-pearl">CC BY 2.0</a>); “Cozy candlelit dinner for two” by{" "}
          <a href="https://commons.wikimedia.org/wiki/File:DZ6_2628_Cozy_candlelit_dinner_for_two_elegant_Thai_restaurant_setting_with_twinkling_lights_and_a_delicate_orchid_centerpiece.jpg" className="underline hover:text-pearl">PattayaPatrol</a>
          {" "}(<a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline hover:text-pearl">CC BY-SA 4.0</a>), via Wikimedia Commons. The people shown are not {SITE_NAME} members.
        </p>
      </footer>
    </>
  );
}
