import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { adminSecurityState, requireAdminAccount } from "@/lib/admin";
import { SITE_NAME } from "@/lib/config";
import { AdminNav } from "../admin-nav";
import { removeFactor } from "./actions";
import { CodeForm, EnrollPanel } from "./mfa-forms";

export const metadata: Metadata = { title: "Admin security" };

async function Mfa() {
  await connection();
  const { supabase } = await requireAdminAccount();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.all ?? []).filter((f) => f.factor_type === "totp" && f.status === "verified");
  const { fresh } = await adminSecurityState();
  const mode = verified.length === 0 ? "enroll" : fresh ? "manage" : "challenge";

  if (mode === "manage") {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
        <Link href="/discover" className="display text-2xl">{SITE_NAME}</Link>
        <Suspense fallback={null}>
          <AdminNav current="security" />
        </Suspense>
        <h1 className="display mt-8 text-4xl">Admin security</h1>
        <p className="mt-3 max-w-[60ch] text-dusk">
          Admin pages need a code from your authenticator app. Your session stays unlocked for 8 hours, then asks again.
          Add a second device so losing a phone never locks you out.
        </p>

        <h2 className="display mt-10 text-2xl">Your authenticator apps</h2>
        <ul className="mt-4 space-y-3">
          {verified.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
              <div>
                <p className="text-sm font-medium">{f.friendly_name ?? "Authenticator"}</p>
                <p className="text-xs text-dusk">Added {new Date(f.created_at).toLocaleDateString("en-GB")}</p>
              </div>
              {verified.length > 1 ? (
                <form action={removeFactor}>
                  <input type="hidden" name="factor_id" value={f.id} />
                  <button className="btn btn-quiet !py-2 text-sm text-danger">Remove</button>
                </form>
              ) : (
                <span className="text-xs text-dusk">Your only one</span>
              )}
            </li>
          ))}
        </ul>

        <h2 className="display mt-10 text-2xl">Add another device</h2>
        <div className="mt-4 max-w-sm">
          <EnrollPanel buttonLabel="Add another authenticator" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <p className="display text-2xl">{SITE_NAME}</p>
      <main className="flex flex-1 flex-col justify-center py-10">
        {mode === "enroll" ? (
          <>
            <h1 className="display text-4xl">Set up two-step sign-in</h1>
            <p className="mt-3 text-dusk">
              Admin accounts need a code from an authenticator app as well as a password. It takes a minute, and you’ll
              only be asked again every 8 hours.
            </p>
            <div className="mt-8"><EnrollPanel /></div>
          </>
        ) : (
          <>
            <h1 className="display text-4xl">Enter your code</h1>
            <p className="mt-3 text-dusk">Open your authenticator app and enter the 6-digit code for {SITE_NAME}.</p>
            <div className="mt-8"><CodeForm factorId={verified[0].id} /></div>
          </>
        )}
      </main>
    </div>
  );
}

export default function AdminMfaPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-md px-5 py-8" aria-busy="true" />}>
      <Mfa />
    </Suspense>
  );
}
