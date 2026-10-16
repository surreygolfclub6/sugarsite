import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Account deleted" };

export default function GoodbyePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <p className="display text-2xl">{SITE_NAME}</p>
      <h1 className="display mt-8 text-4xl">Your account has been deleted</h1>
      <p className="mt-4 text-dusk">
        Your profile, photos, messages and other details have been removed. Thank you for spending time with us.
      </p>
      <Link href="/" className="btn btn-quiet mt-8 self-start">Back to the home page</Link>
    </main>
  );
}
