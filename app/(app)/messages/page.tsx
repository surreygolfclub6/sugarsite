import { Suspense } from "react";
import type { Metadata } from "next";
import { Toast } from "@/components/toast";

export const metadata: Metadata = { title: "Messages" };

// The list itself lives in the layout, so it stays beside the open conversation on wide screens. This is what fills the right-hand
// side when nothing is open (on a phone the list is all you see).
async function Placeholder({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <Toast key={sp.deleted ?? ""} message={sp.deleted ? "Conversation deleted." : undefined} cleanPath="/messages" />
      <div className="hidden h-full place-items-center p-10 text-center text-dusk lg:grid">
        <div>
          <p className="display text-3xl text-pearl">Your conversations</p>
          <p className="mt-2">Pick one on the left to read and reply.</p>
        </div>
      </div>
    </>
  );
}

export default function MessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <Placeholder searchParams={searchParams} />
    </Suspense>
  );
}
