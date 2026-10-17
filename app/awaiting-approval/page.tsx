import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COMPANY, SITE_NAME } from "@/lib/config";
import { signOut } from "@/app/(auth)/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { setupPath } from "@/lib/member-status";

export const metadata: Metadata = { title: "Waiting for approval" };

async function Waiting() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/awaiting-approval");

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  const status = profile?.status;
  // Anyone who isn't waiting here belongs somewhere else: finishing setup, the age check, or the app itself.
  if (status !== "awaiting_approval" && status !== "declined") redirect(setupPath(status) ?? "/discover");

  const declined = status === "declined";
  return (
    <div className="text-center">
      {!declined && <AutoRefresh seconds={30} />}
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-brass/50 bg-velvet">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {declined ? <path d="M6 6l12 12M18 6 6 18" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
        </svg>
      </div>
      <h1 className="display mt-6 text-4xl">{declined ? "We couldn’t approve your account" : "Your profile is waiting for approval"}</h1>
      {declined ? (
        <p className="mt-4 text-dusk">
          After reviewing your profile we weren’t able to approve it for {SITE_NAME}. If you think this is a mistake,
          please email <a href={`mailto:${COMPANY.email}`} className="text-pearl underline underline-offset-2">{COMPANY.email}</a>.
        </p>
      ) : (
        <>
          <p className="mt-4 text-dusk">
            Thanks for joining {SITE_NAME}. We’re in a testing phase, so a member of our team checks every new profile
            before it goes live.
          </p>
          <ul className="mx-auto mt-8 max-w-xs space-y-2 text-left text-sm text-dusk">
            <li>Your age check is done, so there’s nothing more to do.</li>
            <li>You’ll be taken straight in as soon as you’re approved. This page checks for you.</li>
            <li>Until then your profile stays hidden and you can’t see other members.</li>
          </ul>
          <p className="mt-6">
            <Link href="/awaiting-approval" className="btn btn-quiet">Check again</Link>
          </p>
        </>
      )}
      <div className="mt-8 flex items-center justify-center gap-5 text-sm text-dusk">
        <form action={signOut}>
          <button className="underline underline-offset-2 hover:text-pearl">Sign out</button>
        </form>
        <Link href="/more/account" className="underline underline-offset-2 hover:text-pearl">Delete my account</Link>
      </div>
    </div>
  );
}

export default function AwaitingApprovalPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <p className="display text-2xl">{SITE_NAME}</p>
      <main className="flex flex-1 flex-col justify-center py-10">
        <Suspense fallback={<div aria-busy="true" />}>
          <Waiting />
        </Suspense>
      </main>
    </div>
  );
}
