"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-checks the page every so often, so a member waiting for approval is moved on soon after a moderator approves them.
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
