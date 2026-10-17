import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupPath } from "@/lib/member-status";
import { perDayText, type Progress } from "@/lib/levels";
import { LevelBadge } from "@/components/level-badge";
import { LevelDefinitions, LevelLadder } from "@/components/level-ladder";

export const metadata: Metadata = { title: "Levels" };

async function Levels() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  const setup = setupPath(me?.status);
  if (!me || setup) redirect(setup ?? "/onboarding");

  const { data } = await supabase.rpc("my_progress");
  const progress = data as Progress | null;
  if (!progress) redirect("/more");

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <h1 className="display text-4xl">Levels</h1>
        <Link href="/more" className="btn btn-quiet">Back</Link>
      </div>
      <p className="mt-3 px-1 text-dusk">
        <span className="mr-2 inline-block align-middle"><LevelBadge tier={progress.tier} className="size-5" /></span>
        You’re a <strong className="text-pearl">{progress.label}</strong> with {perDayText(progress.daily_conversations).toLowerCase()}.
        Replying and messaging a match are always unlimited.
      </p>

      <div className="mt-6">
        <LevelLadder progress={progress} />
      </div>

      <section className="mt-8 rounded-2xl border border-line p-5" aria-label="How it is counted">
        <h2 className="display text-2xl">How it’s counted</h2>
        <div className="mt-4"><LevelDefinitions /></div>
        <p className="mt-4 text-sm text-dusk">
          Your personal invite link is on the <Link href="/more" className="text-pearl underline underline-offset-2">More</Link> page.{" "}
          <Link href="/levels" className="text-pearl underline underline-offset-2">Share this guide</Link> with a friend.
        </p>
      </section>
    </>
  );
}

export default function MoreLevelsPage() {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <Levels />
    </Suspense>
  );
}
