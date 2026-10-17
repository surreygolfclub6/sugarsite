import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_NAME } from "@/lib/config";
import { validUnsubscribe } from "@/lib/unsubscribe";

export const metadata: Metadata = { title: "Stop emails", robots: { index: false } };

async function stop(formData: FormData) {
  "use server";
  const u = String(formData.get("u") ?? "");
  const t = String(formData.get("t") ?? "");
  if (/^[0-9a-f-]{36}$/.test(u) && validUnsubscribe(u, t)) {
    await createAdminClient().from("profiles").update({ email_notifications: false }).eq("id", u);
  }
  const { redirect } = await import("next/navigation");
  redirect("/unsubscribe?done=1");
}

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const valid = !!sp.u && !!sp.t && /^[0-9a-f-]{36}$/.test(sp.u) && validUnsubscribe(sp.u, sp.t);
  return (
    <main className="mx-auto w-full max-w-md px-5 py-16">
      <Link href="/" className="display text-2xl">{SITE_NAME}</Link>
      {sp.done ? (
        <>
          <h1 className="display mt-8 text-4xl">You’re unsubscribed</h1>
          <p className="mt-3 text-dusk">We won’t email you about new messages. You can turn them back on any time under More, then Account and security.</p>
        </>
      ) : valid ? (
        <>
          <h1 className="display mt-8 text-4xl">Stop message emails?</h1>
          <p className="mt-3 text-dusk">We’ll stop emailing you when someone messages you. Your messages will still be waiting for you on {SITE_NAME}.</p>
          <form action={stop} className="mt-6">
            <input type="hidden" name="u" value={sp.u} />
            <input type="hidden" name="t" value={sp.t} />
            <button className="btn btn-primary">Stop these emails</button>
          </form>
        </>
      ) : (
        <>
          <h1 className="display mt-8 text-4xl">This link isn’t valid</h1>
          <p className="mt-3 text-dusk">You can change email settings under More, then Account and security.</p>
        </>
      )}
    </main>
  );
}
