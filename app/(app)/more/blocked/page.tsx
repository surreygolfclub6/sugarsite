import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unblockMember } from "../../safety/actions";

export const metadata: Metadata = { title: "Blocked members" };

async function Blocked() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked, blocked_name, created_at")
    .eq("blocker", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <h1 className="display text-4xl">Blocked</h1>
        <Link href="/more" className="btn btn-quiet">Back</Link>
      </div>
      <p className="mt-3 px-1 text-sm text-dusk">
        Blocked members can’t see your profile or message you, and you can’t see theirs. Unblocking brings everything back.
      </p>

      {(blocks ?? []).length === 0 ? (
        <p className="mt-10 px-1 text-dusk">You haven’t blocked anyone.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line" aria-label="Blocked members">
          {(blocks ?? []).map((b) => (
            <li key={b.blocked} data-blocked={b.blocked} className="flex items-center justify-between gap-3 px-1 py-4">
              <span className="font-medium">{b.blocked_name ?? "Member"}</span>
              <form action={unblockMember}>
                <input type="hidden" name="profile_id" value={b.blocked} />
                <button className="btn btn-quiet !py-2">Unblock {b.blocked_name ?? "member"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <Blocked />
    </Suspense>
  );
}
