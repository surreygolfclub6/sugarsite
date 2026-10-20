import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";

// The usual bottom tabs on every admin screen, so moderators can get back to the site. The padding keeps content clear of them.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-24">{children}</div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}
