"use client";

import { useRef, useState } from "react";
import { ShareDialog } from "@/components/safety-menu";
import { createClient } from "@/lib/supabase/client";

// A shortcut on someone's profile to share your private photos with them, or to stop. The same action as in the chat menu.
export function PrivateShareLink({ meId, otherId, name, shared: initial }: { meId: string; otherId: string; name: string; shared: boolean }) {
  const [shared, setShared] = useState(initial);
  const [note, setNote] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null);

  async function stop() {
    const { error } = await createClient().from("photo_shares").delete().eq("owner_id", meId).eq("viewer_id", otherId);
    if (!error) setShared(false);
    setNote(error ? "We couldn’t stop sharing. Please try again." : `You’ve stopped sharing your private photos with ${name}.`);
  }

  return (
    <div className="px-1 text-sm">
      {shared ? (
        <p className="flex flex-wrap items-center gap-x-2 text-dusk">
          <span>{name} can see your private photos.</span>
          <button type="button" onClick={stop} className="underline underline-offset-2 hover:text-pearl">Stop sharing</button>
        </p>
      ) : (
        <button type="button" onClick={() => dialog.current?.showModal()} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 hover:bg-velvet">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Share my private photos with {name}
        </button>
      )}
      {note && <p role="status" className="mt-2 text-dusk">{note}</p>}
      <ShareDialog dialogRef={dialog} meId={meId} otherId={otherId} name={name} onShared={() => { setShared(true); setNote(undefined); }} />
    </div>
  );
}
