"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; name: string };

// Who your private photos are shared with, and the people you could share them with (members you've talked to or matched with).
export function PrivateSharing({ meId, people, shared: initial }: { meId: string; people: Person[]; shared: string[] }) {
  const [supabase] = useState(() => createClient());
  const [shared, setShared] = useState(new Set(initial));
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  async function toggle(person: Person) {
    setBusy(person.id);
    setError(undefined);
    const on = shared.has(person.id);
    const { error: failed } = on
      ? await supabase.from("photo_shares").delete().eq("owner_id", meId).eq("viewer_id", person.id)
      : await supabase.from("photo_shares").insert({ owner_id: meId, viewer_id: person.id });
    setBusy(undefined);
    if (failed && failed.code !== "23505") return setError(on ? "We couldn’t stop sharing. Please try again." : "We couldn’t share. Please try again.");
    setShared((s) => {
      const next = new Set(s);
      if (on) next.delete(person.id);
      else next.add(person.id);
      return next;
    });
  }

  return (
    <section aria-label="Share private photos" className="rounded-2xl border border-line p-5">
      <h2 className="display text-2xl">Share your private photos</h2>
      <p className="mt-2 text-sm text-dusk">
        Choose who can see your private photos. You can share with people you’ve been talking to or matched with, and stop
        whenever you like. Anyone who can see a photo could save it, so only share with people you trust.
      </p>
      {people.length === 0 ? (
        <p className="mt-4 text-sm text-dusk">When you’ve chatted with someone or matched, they’ll appear here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {people.map((p) => {
            const on = shared.has(p.id);
            return (
              <li key={p.id} data-person={p.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate">{p.name}{on && <span className="ml-2 rounded-full border border-brass px-2 py-0.5 text-xs text-brass">Can see</span>}</span>
                <button type="button" disabled={busy === p.id} onClick={() => toggle(p)} className={`btn !px-4 !py-2 text-sm ${on ? "btn-quiet" : "btn-primary"}`}>
                  {on ? "Stop sharing" : "Share"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div aria-live="polite">{error && <p className="mt-3 text-sm text-danger">{error}</p>}</div>
    </section>
  );
}
