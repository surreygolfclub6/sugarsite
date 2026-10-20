import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

const points = [
  "Every member passes an age check before their profile goes live.",
  "Every photo is looked at by a person before anyone else sees it.",
  "Free to join, with no paywall. Members earn more room by being active and inviting friends.",
];

// A single narrow column on phones. From 1024px up, the form sits beside a panel that says what the site is.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8 lg:max-w-lg lg:px-12">
        <Link href="/" className="display text-2xl">
          {SITE_NAME}
        </Link>
        <main className="flex flex-1 flex-col justify-center py-10">{children}</main>
      </div>
      <aside aria-hidden="true" className="relative hidden flex-col justify-center overflow-hidden bg-garnet-deep px-16 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-white/5" />
        <div className="relative max-w-md">
          <p className="display text-5xl leading-tight">Say what you’re looking for.</p>
          <p className="mt-4 text-lg text-white/80">Adults-only dating on clear terms.</p>
          <ul className="mt-10 space-y-4 text-white/90">
            {points.map((p) => (
              <li key={p} className="flex gap-3">
                <svg viewBox="0 0 24 24" className="mt-1 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
