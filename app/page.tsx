import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="7" fill="var(--brass)" />
      <path d="M4 7.2l2 2L10 5" stroke="var(--night)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="display text-2xl">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="btn btn-quiet !py-2 text-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary !py-2 text-sm">
            Join free
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-20">
          <div>
            <h1 className="display text-[clamp(2.9rem,8vw,6.2rem)]">
              Say what you’re looking for.
            </h1>
            <p className="serif-body mt-7 max-w-[34ch] text-xl text-dusk sm:text-2xl">
              Meet adults who’d rather be direct about the kind of relationship they want.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary">
                Create your profile
              </Link>
              <Link href="/login" className="btn btn-quiet">
                I have an account
              </Link>
            </div>
            <p className="mt-5 text-sm text-dusk">Free to join. 18 and over only.</p>
          </div>

          {/* A sample profile: shows the product's one idea, a profile that states its terms. */}
          <div className="rise mx-auto w-full max-w-sm lg:mx-0 lg:justify-self-end" aria-label="Example profile">
            <div className="overflow-hidden rounded-[22px] border border-line bg-velvet">
              <div
                className="relative aspect-[4/4.2]"
                style={{
                  background:
                    "radial-gradient(120% 90% at 30% 20%, #6b2c45 0%, #3b1c33 45%, #1b1220 100%)",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(22,15,24,0.92) 0%, rgba(22,15,24,0) 55%)",
                  }}
                />
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="display flex items-center gap-2 text-3xl">
                    Elena, 29 <Check />
                  </p>
                  <p className="text-sm text-dusk">London · Verified</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <p className="serif-body italic text-pearl/90">
                  “Between projects and travelling a lot. I like good dinners and someone who’s
                  easy to talk to.”
                </p>
                <div className="border-t border-line pt-4">
                  <p className="text-sm font-semibold text-brass">What I’m looking for</p>
                  <p className="mt-1 text-sm text-dusk">
                    A relationship with clear expectations, discretion on both sides, and time
                    together that suits two busy diaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-3">
            <div>
              <h2 className="display text-3xl">Verified before visible</h2>
              <p className="mt-3 max-w-[38ch] text-dusk">
                Every member confirms their age and identity before their profile goes live, and
                photos are reviewed by a person.
              </p>
            </div>
            <div>
              <h2 className="display text-3xl">Clear from the first message</h2>
              <p className="mt-3 max-w-[38ch] text-dusk">
                Profiles have a space to say what you want in your own words, so the
                conversation starts with honesty instead of guesswork.
              </p>
            </div>
            <div>
              <h2 className="display text-3xl">You stay in control</h2>
              <p className="mt-3 max-w-[38ch] text-dusk">
                Block or report anyone in two taps. Scams and fake profiles are removed, and
                repeat offenders are banned.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-dusk sm:px-8 md:flex-row md:items-start md:justify-between">
          <p className="max-w-[60ch]">
            {SITE_NAME} is for adults aged 18 and over. We don’t allow, and will remove,
            anything that offers or requests sexual services for payment.
          </p>
          <p className="max-w-[40ch] text-xs">
            Place data from{" "}
            <a href="https://www.geonames.org" className="underline hover:text-pearl">GeoNames</a>, licensed under{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" className="underline hover:text-pearl">CC BY 4.0</a>.
          </p>
          <nav className="flex gap-5">
            <Link href="/terms" className="hover:text-pearl">Terms</Link>
            <Link href="/privacy" className="hover:text-pearl">Privacy</Link>
            <Link href="/safety" className="hover:text-pearl">Safety</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
