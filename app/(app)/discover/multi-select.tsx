"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

export function MultiSelect({
  name,
  label,
  options,
  defaultValues = [],
}: {
  name: string;
  label: string;
  options: readonly Option[];
  defaultValues?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const all = selected.length === options.length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = (value: string) =>
    setSelected((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));

  const names = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  const summary = selected.length === 0 ? "Any" : all ? "All" : names.length <= 2 ? names.join(", ") : `${names.length} selected`;

  return (
    <div ref={root} className="relative">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${label}: ${summary}`}
        onClick={() => setOpen((o) => !o)}
        className="field flex items-center justify-between gap-3 text-left"
      >
        <span className="truncate">{summary}</span>
        <span aria-hidden className="text-dusk">{open ? "▴" : "▾"}</span>
      </button>

      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      {open && (
        <div role="group" aria-label={label} className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-velvet p-2 shadow-lg">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium hover:bg-velvet-2">
            <input
              type="checkbox"
              checked={all}
              onChange={() => setSelected(all ? [] : options.map((o) => o.value))}
            />
            Select all
          </label>
          {options.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-velvet-2">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
