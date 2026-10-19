import Link from "next/link";
import { COMPANY, SITE_NAME } from "@/lib/config";

// Public pages that explain the site. They sit outside the legal layout because they are not drafts of legal text.
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="display text-2xl">{SITE_NAME}</Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="btn btn-quiet !py-2 text-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary !py-2 text-sm">Join free</Link>
        </nav>
      </header>

      <main className="mt-10 [&_h1]:display [&_h1]:text-4xl sm:[&_h1]:text-5xl [&_h2]:display [&_h2]:mt-10 [&_h2]:text-2xl [&_h3]:mt-6 [&_h3]:font-medium [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </main>

      <footer className="mt-14 border-t border-line pt-6 text-sm text-dusk">
        <nav aria-label="More about us" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/how-it-works" className="hover:text-pearl">How it works</Link>
          <Link href="/faq" className="hover:text-pearl">FAQ</Link>
          <Link href="/levels" className="hover:text-pearl">Levels</Link>
          <Link href="/safety" className="hover:text-pearl">Safety</Link>
          <Link href="/terms" className="hover:text-pearl">Terms</Link>
          <Link href="/privacy" className="hover:text-pearl">Privacy</Link>
          <a href={`mailto:${COMPANY.email}`} className="hover:text-pearl">Contact</a>
        </nav>
        <p className="mt-4">{SITE_NAME} is for adults aged 18 and over.</p>
      </footer>
    </div>
  );
}
