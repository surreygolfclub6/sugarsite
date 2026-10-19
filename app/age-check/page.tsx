import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COMPANY, SITE_NAME } from "@/lib/config";
import { ageCheckEnabled } from "@/lib/age-assurance";

export const metadata: Metadata = { title: "Verify your age" };

const MESSAGES: Record<string, string> = {
  cancelled: "The check wasn’t completed. You can try again whenever you’re ready.",
  state: "That check didn’t start from this browser. Please start again.",
  not_verified: "The age check finished without confirming you’re 18 or over. This usually means the check wasn’t completed or the method didn’t pass. Please try again.",
  too_young: "We couldn’t confirm that you’re 18 or over, so we can’t make your profile live.",
  low_assurance: "The method you used isn’t strong enough for us. Please try again and choose a different method if one is offered.",
  expired: "That check has expired. Please start a new one.",
  used: "That age check has already been used for another account. Contact support if you think this is a mistake.",
  unavailable: "We couldn’t reach the age check service. Please try again in a few minutes.",
};

async function AgeCheck({ searchParams }: { searchParams: Promise<{ error?: string; ref?: string }> }) {
  await connection();
  const { error, ref } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/age-check");

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (!profile || profile.status === "incomplete") redirect("/onboarding");
  if (profile.status !== "pending_review" || !ageCheckEnabled()) redirect("/discover");

  return (
    <div className="text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-brass/50 bg-velvet">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <h1 className="display mt-6 text-4xl">One last step: confirm your age</h1>
      <p className="mt-4 text-dusk">
        {SITE_NAME} is for adults only. Before your profile goes live, we need to confirm that you’re 18 or over.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-line px-4 py-3 text-sm text-danger">
          {MESSAGES[error] ?? MESSAGES.unavailable}
          {ref && /^[0-9a-f]{8}$/.test(ref) && (
            <span className="mt-2 block text-xs text-dusk">If it keeps happening, email us and quote reference {ref}.</span>
          )}
        </p>
      )}

      {/* A plain link on purpose: this address starts a check, so the router must never prefetch it. */}
      <a href="/age-check/start" className="btn btn-primary mt-8">
        {error ? "Try again" : "Verify my age"}
      </a>

      <ul className="mx-auto mt-8 max-w-xs space-y-2 text-left text-sm text-dusk">
        <li>It’s done by AgeVerif, a separate age-checking service. It usually takes about a minute.</li>
        <li>We only keep the result, that you’re over 18. We don’t keep your photo or any ID.</li>
        <li>Until you’ve finished, your profile stays hidden and you can’t see other members.</li>
      </ul>

      <p className="mt-8 text-sm text-dusk">
        Need help?{" "}
        <a href={`mailto:${COMPANY.email}`} className="text-pearl underline underline-offset-2">{COMPANY.email}</a>
        <br />
        Changed your mind?{" "}
        <Link href="/more/account" className="text-pearl underline underline-offset-2">Delete your account</Link>
      </p>
    </div>
  );
}

export default function AgeCheckPage({ searchParams }: { searchParams: Promise<{ error?: string; ref?: string }> }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <p className="display text-2xl">{SITE_NAME}</p>
      <main className="flex flex-1 flex-col justify-center py-10">
        <Suspense fallback={<div aria-busy="true" />}>
          <AgeCheck searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
