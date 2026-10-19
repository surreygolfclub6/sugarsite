import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "How it works: honest UK dating, step by step",
  description: `How ${SITE_NAME} works: confirm your age, say what you’re looking for, have your photos checked by a person, then meet members who want the same thing. Free to join.`,
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  { title: "Join and confirm you’re 18 or over", body: "Sign up with your email, then pass a quick age check run by AgeVerif, a separate age-checking service. We only keep the result (that you’re an adult), not your ID or a photo of your face. Members who pass show an Age verified badge." },
  { title: "Say what you’re looking for", body: "Tell people about yourself and the kind of relationship you want, in your own words. Being upfront from the start saves everyone time, and it means the people who get in touch already know what you’re after." },
  { title: "Add photos, public or private", body: "Every photo is looked at by a person on our team before anyone else sees it. You can keep any photo private and share it only with the members you choose, and stop sharing whenever you like." },
  { title: "Search, like and save your searches", body: "Search by age, distance, what people are looking for and more. We only ever show a rounded distance, never an exact location. Save a search you use often and pick it again later. Liking someone is a low-pressure way to say hello, and if they like you back it’s a match." },
  { title: "Message people you’d like to meet", body: "Chat privately on the site. Replying is always unlimited, and so is messaging a match. You can send a photo from your gallery in a chat, and block or report anyone from the menu in any conversation." },
  { title: "Grow with the community", body: "There’s no paywall. Instead, members earn more room to start new conversations by being active, completing their profile and inviting friends who join. You can read exactly how on the levels page." },
];

export default function HowItWorks() {
  return (
    <>
      <h1>How {SITE_NAME} works</h1>
      <p className="serif-body text-xl text-dusk">
        {SITE_NAME} is a dating site for adults who’d rather be direct about the relationship they want. It’s free to join, and here’s what to expect.
      </p>

      <ol className="mt-8 space-y-7">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span aria-hidden="true" className="display flex size-9 shrink-0 items-center justify-center rounded-full border border-brass text-brass">{i + 1}</span>
            <div>
              <h2 className="!mt-0 !text-xl">{s.title}</h2>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2>Built to be safe</h2>
      <ul>
        <li>Every member passes an age check before their profile goes live.</li>
        <li>Photos are reviewed by a person before they appear.</li>
        <li>You can block or report anyone, and our team looks at every report.</li>
        <li>Anything that offers or asks for sexual services for payment isn’t allowed, and gets removed.</li>
      </ul>
      <p>Read more about <Link href="/safety">staying safe</Link>, the <Link href="/levels">levels</Link>, or the <Link href="/faq">questions people ask most</Link>.</p>

      <p className="mt-10"><Link href="/signup" className="btn btn-primary no-underline">Join free</Link></p>
    </>
  );
}
