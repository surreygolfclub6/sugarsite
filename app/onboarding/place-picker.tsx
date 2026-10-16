"use client";

import { placeLabel } from "@/lib/places";
import { useEffect, useId, useRef, useState } from "react";

type Place = { id: number; name: string; county: string | null; nation: string };

export function PlacePicker({
  name = "place_id",
  label: fieldLabel = "Location",
  initial,
  hint = "UK only. Others see your town and a rounded distance, never an exact spot.",
}: {
  name?: string;
  label?: string;
  initial?: { id: number; text: string };
  hint?: string;
}) {
  const listId = useId();
  const [text, setText] = useState(initial?.text ?? "");
  const [placeId, setPlaceId] = useState(initial ? String(initial.id) : "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    // Typing again clears the chosen place, so the form can't submit a stale one.
    if (placeId || text.trim().length < 2) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/places?q=${encodeURIComponent(text)}`);
      if (!res.ok || request !== latest.current) return;
      setResults((await res.json()).places);
      setOpen(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [text, placeId]);

  function choose(p: Place) {
    setText(placeLabel(p));
    setPlaceId(String(p.id));
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={`${name}_search`} className="mb-1.5 block text-sm font-medium">
        {fieldLabel}
      </label>
      <input
        id={`${name}_search`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Start typing your town or city"
        className="field"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPlaceId("");
          if (e.target.value.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <input type="hidden" name={name} value={placeId} />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-velvet p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-dusk">No UK places found.</li>
          ) : (
            results.map((p) => (
              <li
                key={p.id}
                role="option"
                aria-selected={false}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-velvet-2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
              >
                {placeLabel(p)}
              </li>
            ))
          )}
        </ul>
      )}
      <p className="mt-1.5 text-sm text-dusk">{hint}</p>
    </div>
  );
}
