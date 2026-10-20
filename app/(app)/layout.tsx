import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";

// Phones get the bottom tabs; from 1024px up the same sections sit in a bar along the top and the page gets more room.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <TopNav />
      </Suspense>
      <div className="mx-auto w-full max-w-5xl px-2.5 pb-24 pt-3 sm:px-6 lg:max-w-6xl lg:pb-12 lg:pt-6">{children}</div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}
