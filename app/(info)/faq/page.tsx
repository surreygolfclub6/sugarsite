import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Questions and answers",
  description: `Answers to common questions about ${SITE_NAME}: cost, age checks, photos, privacy, messaging limits, and how to delete your account.`,
  alternates: { canonical: "/faq" },
};

const faqs: { q: string; a: string }[] = [
  { q: `Is ${SITE_NAME} free?`, a: "Yes. Joining, searching and messaging are free, and there’s no paywall. Members earn more room to start new conversations by being active and inviting friends. We may add optional paid features in future, and we’ll tell members first." },
  { q: `Who is ${SITE_NAME} for?`, a: "Adults aged 18 and over in the UK who’d rather be direct about the kind of relationship they want." },
  { q: "How does the age check work?", a: "Before your profile goes live you complete a quick check run by AgeVerif, a separate age-checking service, and choose from the options it offers. We only keep the result, that you’re 18 or over. We don’t keep your ID or a photo of your face." },
  { q: "Are the profiles real?", a: "We can’t promise that everyone is who they say they are, but we make it hard to fake. Every member passes an age check, every photo is reviewed by a person before it’s shown, and our team acts on reports. Our safety page has tips for getting to know people." },
  { q: "Can I keep my photos private?", a: "Yes. Any photo can be private. Private photos don’t show on your profile or in search, and you choose which members can see them. You can also stop sharing at any time. Our team still reviews every photo before it’s approved." },
  { q: "Do you show my exact location?", a: "No. Other members only see a rounded distance, never your address or exact position." },
  { q: "Is there a limit on messages?", a: "Replying is always unlimited, and so is messaging a match. There’s a daily limit on starting brand-new conversations, which rises as you complete your profile, have conversations and invite friends. The levels page explains it in full." },
  { q: "How do I get more new conversations a day?", a: "Add a photo, complete your profile, have conversations and invite friends who join. Each level needs a certain number of friends who’ve become real members: 1 for Member, 3 for Trusted and 10 for Champion." },
  { q: "Do I get emails?", a: `Only when someone messages you, and at most one an hour for each conversation. The email says who wrote, never what they wrote. You can turn them off in More, Account and security, or with the link in any email.` },
  { q: "How do I block or report someone?", a: "Open their profile or your conversation with them and use the three dots menu. Blocking is silent: they aren’t told. Reports go to our moderators." },
  { q: "What isn’t allowed?", a: `Fake profiles, harassment, scams, anything involving under-18s, and anything that offers or asks for sexual services for payment. Our Terms have the full list.` },
  { q: "How do I delete my account or get my data?", a: "Go to More, then Account and security. You can download a copy of your data or delete your account there. Deleting removes your profile and photos." },
  { q: "How do I contact you?", a: `Email ${COMPANY.email}.` },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function Faq() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <h1>Questions and answers</h1>
      <p className="serif-body text-xl text-dusk">The things people ask us most. Can’t find yours? Email {COMPANY.email}.</p>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {faqs.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="cursor-pointer list-none font-medium marker:hidden">{f.q}</summary>
            <p className="text-dusk">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8">New here? See <Link href="/how-it-works">how it works</Link>, or <Link href="/signup">join free</Link>.</p>
    </>
  );
}
