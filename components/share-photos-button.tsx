"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Share (or stop sharing) your private photos with one person, from inside a conversation. Sharing takes two steps so
// nobody does it by accident, and stopping takes one.
export function SharePhotosButton({ meId, otherId, name, canShare, shared: initial }: { meId: string; otherId: string; name: string; canShare: boolean; shared: boolean }) {
  const [supabase] = useState(() => createClient());
  const [shared, setShared] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!canShare && !shared) return null;

  async function share() {
    setBusy(true);
    setError(undefined);
    const { error: insertError } = await supabase.from("photo_shares").insert({ owner_id: meId, viewer_id: otherId });
    setBusy(false);
    if (insertError && insertError.code !== "23505") return setError("We couldn’t share. Please try again.");
    setShared(true);
    setConfirming(false);
  }

  async function stop() {
    setBusy(true);
    setError(undefined);
    const { error: deleteError } = await supabase.from("photo_shares").delete().eq("owner_id", meId).eq("viewer_id", otherId);
    setBusy(false);
    if (deleteError) return setError("We couldn’t stop sharing. Please try again.");
    setShared(false);
  }

  const pill = "flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs hover:border-dusk disabled:opacity-60";
  const lock = (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );

  return (
    <div className="relative">
      {shared ? (
        <button type="button" disabled={busy} onClick={stop} className={`${pill} border-brass text-brass`} title={`${name} can see your private photos. Tap to stop sharing.`}>
          {lock} Shared · Stop
        </button>
      ) : confirming ? (
        <div role="group" aria-label={`Share private photos with ${name}`} className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-velvet p-3 text-sm shadow-lg">
          <p>Share your private photos with {name}? They’ll be able to see them until you stop sharing. Only share with people you trust.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={share} className="btn btn-primary !px-4 !py-2 text-sm">Yes, share</button>
            <button type="button" onClick={() => setConfirming(false)} className="btn btn-quiet !px-4 !py-2 text-sm">Cancel</button>
          </div>
        </div>
      ) : null}
      {!shared && (
        <button type="button" onClick={() => setConfirming((c) => !c)} aria-expanded={confirming} className={pill}>
          {lock} Share private photos
        </button>
      )}
      {error && <p role="alert" className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-danger">{error}</p>}
    </div>
  );
}
