import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";

// The usual navigation on every admin screen so moderators can get back to the site: bottom tabs on phones, a top bar on wide
// screens. The padding keeps content clear of the tabs.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <TopNav />
      </Suspense>
      <div className="pb-24 lg:pb-12">{children}</div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}
