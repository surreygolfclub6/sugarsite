import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

async function Reset() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reaching this page needs the session that the emailed link creates.
  if (!user) {
    return (
      <div>
        <h1 className="display text-4xl">This link has expired</h1>
        <p className="mt-3 text-dusk">Reset links only work once and for a short time.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-6">Ask for a new link</Link>
      </div>
    );
  }
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div aria-busy="true" />}>
      <Reset />
    </Suspense>
  );
}
