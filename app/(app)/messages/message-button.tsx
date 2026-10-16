"use client";

import { useEffect, useState, useTransition } from "react";
import { openConversation } from "./actions";

// Starts (or reopens) a conversation. Errors from the database, such as the daily limit on new
// conversations, are shown to the member rather than swallowed.
export function MessageButton({
  profileId,
  name,
  variant,
}: {
  profileId: string;
  name: string;
  variant: "bar" | "icon";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(undefined), 6000);
    return () => clearTimeout(t);
  }, [error]);

  function open() {
    setError(undefined);
    startTransition(async () => {
      const result = await openConversation(profileId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      {variant === "bar" ? (
        <button type="button" onClick={open} disabled={pending} className="btn btn-primary w-full">
          {pending ? "Opening…" : "Message"}
        </button>
      ) : (
        <button type="button" onClick={open} disabled={pending} aria-label={`Message ${name}`} className="p-2 text-dusk hover:text-pearl disabled:opacity-50">
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
            <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" />
          </svg>
        </button>
      )}
      {error && (
        <p role="alert" className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-xl border border-line bg-velvet-2 px-4 py-3 text-sm shadow-lg">
          {error}
        </p>
      )}
    </>
  );
}
