import Link from "next/link";
import { COMPANY, LEGAL_DRAFT, LEGAL_UPDATED, SITE_NAME } from "@/lib/config";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="display text-2xl">{SITE_NAME}</Link>
        <Link href="/login" className="text-sm text-dusk underline underline-offset-2">Sign in</Link>
      </header>

      {LEGAL_DRAFT && (
        <p role="note" className="mt-6 rounded-xl border border-brass px-4 py-3 text-sm text-brass">
          Draft for review. This text has not yet been checked by a solicitor and may change before launch.
        </p>
      )}

      <main className="mt-8 [&_h1]:display [&_h1]:text-4xl [&_h2]:display [&_h2]:mt-10 [&_h2]:text-2xl [&_h3]:mt-6 [&_h3]:font-medium [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:underline-offset-2">
        {children}
        <p className="mt-10 text-sm text-dusk">Last updated {LEGAL_UPDATED}.</p>
      </main>

      <footer className="mt-12 border-t border-line pt-6 text-sm text-dusk">
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/terms" className="hover:text-pearl">Terms</Link>
          <Link href="/privacy" className="hover:text-pearl">Privacy</Link>
          <Link href="/safety" className="hover:text-pearl">Safety</Link>
        </nav>
        <p className="mt-4">{COMPANY.name} · {COMPANY.address}</p>
      </footer>
    </div>
  );
}
