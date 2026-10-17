"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type Saved = { id: string; name: string; summary: string };

// A drop-down of saved searches. Choosing one fills the search form with it; the bin beside each one deletes it.
export function SavedPicker({ items, current, load, remove }: { items: Saved[]; current?: string; load: (id: string) => Promise<void>; remove: (id: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const chosen = items.find((s) => s.id === current);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative mt-6">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" className="field flex w-full items-center justify-between gap-3 text-left">
        <span className="truncate">{chosen ? chosen.name : `Saved searches (${items.length})`}</span>
        <svg viewBox="0 0 24 24" className={`size-4 shrink-0 text-dusk transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="radiogroup" aria-label="Saved searches" aria-busy={pending} className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-night p-1 shadow-lg">
          {items.map((s) => (
            <div key={s.id} data-saved={s.id} className="flex items-center gap-1 rounded-xl hover:bg-velvet">
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-3 py-2.5">
                <input
                  type="radio"
                  name="saved_search"
                  value={s.id}
                  checked={s.id === current}
                  disabled={pending}
                  onChange={() => start(() => load(s.id))}
                  className="mt-1 size-4 shrink-0 accent-garnet"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{s.name}</span>
                  <span className="block text-xs text-dusk">{s.summary}</span>
                </span>
              </label>
              <button type="button" disabled={pending} onClick={() => start(() => remove(s.id))} aria-label={`Delete saved search ${s.name}`} className="grid size-9 shrink-0 place-items-center rounded-full text-dusk hover:text-danger">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6m4-6v6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
