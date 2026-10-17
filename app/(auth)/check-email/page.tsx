import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Check your email" };

async function CheckEmail() {
  await connection();
  const email = (await cookies()).get("signup_email")?.value;
  // Nobody has just signed up in this browser, so there's nothing to confirm here.
  if (!email) redirect("/signup");

  return (
    <div className="text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-brass/50 bg-velvet">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </div>
      <h1 className="display mt-6 text-4xl">Check your email</h1>
      <p className="mt-3 text-dusk">We’ve sent a confirmation link to</p>
      <p className="mt-1 break-all font-semibold">{email}</p>
      <p className="mt-5 text-dusk">Open the link to confirm your address and finish creating your profile.</p>

      <ul className="mx-auto mt-8 max-w-xs space-y-2 text-left text-sm text-dusk">
        <li>Open the link in this browser so you’re signed in straight away.</li>
        <li>Can’t see it? Check your spam or junk folder.</li>
        <li>The link works once and expires after a while.</li>
      </ul>

      <div className="mt-8 border-t border-line pt-6">
        <p className="mb-4 text-sm text-dusk">Didn’t get it?</p>
        <ResendForm />
      </div>

      <p className="mt-8 text-sm text-dusk">
        Wrong address?{" "}
        <Link href="/signup" className="text-pearl underline underline-offset-2">Sign up again</Link>
        {" · "}
        <Link href="/login" className="text-pearl underline underline-offset-2">Sign in</Link>
      </p>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div aria-busy="true" />}>
      <CheckEmail />
    </Suspense>
  );
}
