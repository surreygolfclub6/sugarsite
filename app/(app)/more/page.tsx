import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { ThemeSetting } from "@/components/theme-setting";
import { COMPANY } from "@/lib/config";
import { LevelCard } from "./level-card";

export const metadata: Metadata = { title: "More" };

async function More() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin_user", { uid: user.id });

  const link = "block rounded-xl border border-line px-4 py-4 hover:bg-velvet";
  return (
    <>
      <h1 className="display px-1 text-4xl">More</h1>
      <div className="mt-6 lg:mb-3">
        <Suspense fallback={null}>
          <LevelCard userId={user.id} />
        </Suspense>
      </div>
      <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        <li><Link href="/more/levels" className={link}>Levels and invites</Link></li>
        <li><Link href="/more/profile" className={link}>Edit profile</Link></li>
        <li><Link href="/photos" className={link}>Your photos</Link></li>
        <li><Link href="/discover/filters" className={link}>Search filters and saved searches</Link></li>
        <li><Link href="/more/blocked" className={link}>Blocked members</Link></li>
        <li><Link href="/more/account" className={link}>Account and security</Link></li>
        {isAdmin && <li><Link href="/admin" className={link}>Photo review (admin)</Link></li>}
        <li className="rounded-xl border border-line px-4 py-4">
          <ThemeSetting />
        </li>
        <li>
          <form action={signOut}>
            <button className={`${link} w-full text-left`}>Sign out</button>
          </form>
        </li>
      </ul>

      <footer className="mt-10 border-t border-line px-1 pt-6 text-sm text-dusk">
        <nav aria-label="Legal and contact" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-pearl">Terms</Link>
          <Link href="/privacy" className="hover:text-pearl">Privacy</Link>
          <Link href="/safety" className="hover:text-pearl">Safety</Link>
          <a href={`mailto:${COMPANY.email}`} className="hover:text-pearl">Contact</a>
        </nav>
      </footer>
    </>
  );
}

export default function MorePage() {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
      <More />
    </Suspense>
  );
}
