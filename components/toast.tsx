"use client";

import { useEffect, useState } from "react";

// A short message that appears at the bottom of the screen and goes away by itself. The address it came from is tidied up
// so reloading the page doesn't show it again.
export function Toast({ message, tone = "info", cleanPath }: { message?: string; tone?: "info" | "error"; cleanPath?: string }) {
  const [dismissed, setDismissed] = useState<string>();
  const shown = message && message !== dismissed ? message : undefined;

  useEffect(() => {
    if (!message) return;
    if (cleanPath) {
      try {
        window.history.replaceState(window.history.state, "", cleanPath);
      } catch {}
    }
    const timer = setTimeout(() => setDismissed(message), tone === "error" ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [message, tone, cleanPath]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      {shown && (
        <p role={tone === "error" ? "alert" : "status"} data-toast className="pointer-events-auto max-w-sm rounded-full border border-line bg-night px-5 py-3 text-center text-sm shadow-lg">
          {shown}
        </p>
      )}
    </div>
  );
}
