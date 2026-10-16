import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "More" };

async function More() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });

  const link = "block rounded-xl border border-line px-4 py-4 hover:bg-velvet";
  return (
    <>
      <h1 className="display px-1 text-4xl">More</h1>
      <ul className="mt-6 space-y-3">
        <li><Link href="/more/profile" className={link}>Edit profile</Link></li>
        <li><Link href="/photos" className={link}>Your photos</Link></li>
        <li><Link href="/discover/filters" className={link}>Search filters</Link></li>
        <li><Link href="/more/blocked" className={link}>Blocked members</Link></li>
        <li><Link href="/more/account" className={link}>Account and security</Link></li>
        {isAdmin && <li><Link href="/admin" className={link}>Photo review (admin)</Link></li>}
        <li>
          <form action={signOut}>
            <button className={`${link} w-full text-left`}>Sign out</button>
          </form>
        </li>
      </ul>
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
