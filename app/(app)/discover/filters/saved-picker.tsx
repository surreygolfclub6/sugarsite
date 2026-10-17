"use client";

import { useState } from "react";

type Saved = { id: string; name: string; summary: string };
type Action = (formData: FormData) => void | Promise<void>;

// Pick one of your saved searches from a drop-down, then search with it, edit it or delete it.
export function SavedPicker({ items, open, edit, remove }: { items: Saved[]; open: Action; edit: Action; remove: Action }) {
  const [id, setId] = useState("");
  const chosen = items.find((s) => s.id === id);

  return (
    <form aria-label="Saved searches" className="mt-6 rounded-2xl border border-line p-4">
      <label htmlFor="saved_search" className="text-sm font-medium">Saved searches</label>
      <select id="saved_search" name="id" value={id} onChange={(e) => setId(e.target.value)} className="field mt-2 w-full">
        <option value="">Choose a saved search ({items.length})</option>
        {items.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <p className="mt-2 min-h-5 text-xs text-dusk">{chosen?.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button formAction={open} disabled={!chosen} className="btn btn-primary !px-4 !py-2 text-sm">Search</button>
        <button formAction={edit} disabled={!chosen} className="btn btn-quiet !px-4 !py-2 text-sm">Edit</button>
        <button formAction={remove} disabled={!chosen} aria-label={chosen ? `Delete saved search ${chosen.name}` : "Delete saved search"} className="btn btn-quiet !px-4 !py-2 text-sm">Delete</button>
      </div>
    </form>
  );
}
