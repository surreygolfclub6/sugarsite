import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Toast } from "@/components/toast";
import { ChangePasswordForm, DeleteAccountForm } from "./account-forms";
import { setEmailNotifications } from "./actions";

export const metadata: Metadata = { title: "Account and security" };

async function Account({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const { data: prefs } = await createAdminClient().from("profiles").select("email_notifications").eq("id", user.id).maybeSingle();

  const card = "rounded-2xl border border-line bg-velvet p-5";
  return (
    <>
      <div className="flex items-center justify-between px-1">
        <h1 className="display text-4xl">Account</h1>
        <Link href="/more" className="btn btn-quiet">Back</Link>
      </div>
      <p className="mt-3 px-1 text-sm text-dusk">Signed in as {user.email}</p>

      <Toast message={sp.saved === "notifications" ? "Email settings saved." : undefined} key={sp.saved ?? ""} cleanPath="/more/account" />

      <div className="mt-6 space-y-4">
        <section aria-labelledby="notify" className={card}>
          <h2 id="notify" className="display text-2xl">Email notifications</h2>
          <form action={setEmailNotifications} className="mt-3">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="notify" defaultChecked={prefs?.email_notifications ?? true} className="mt-0.5 size-4 accent-garnet" />
              <span>
                Email me when someone sends me a message.
                <span className="block text-dusk">We never include what they wrote, and send at most one email an hour per conversation.</span>
              </span>
            </label>
            <button className="btn btn-quiet mt-4">Save</button>
          </form>
        </section>

        <section aria-labelledby="pw" className={card}>
          <h2 id="pw" className="display text-2xl">Password</h2>
          <div className="mt-4"><ChangePasswordForm /></div>
        </section>

        <section aria-labelledby="data" className={card}>
          <h2 id="data" className="display text-2xl">Your data</h2>
          <p className="mt-2 text-sm text-dusk">
            Download a copy of the information we hold about you: your profile, photo details, likes, blocks and your
            conversations.
          </p>
          <a href="/more/account/export" className="btn btn-quiet mt-4">Download my data</a>
        </section>

        <section aria-labelledby="delete" className={card}>
          <h2 id="delete" className="display text-2xl">Delete account</h2>
          <div className="mt-4"><DeleteAccountForm /></div>
        </section>
      </div>
    </>
  );
}

export default function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}
