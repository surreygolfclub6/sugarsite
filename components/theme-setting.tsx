"use client";

import { useSyncExternalStore } from "react";

type Pref = "dark" | "light" | "system";

const OPTIONS: { value: Pref; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match my device" },
];

// The choice lives in this browser (localStorage). The inline script in the root layout applies it before first
// paint, so pages never flash the wrong theme; this control only changes it.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

function readPref(): Pref {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "dark" || stored === "system" ? stored : "light";
  } catch {
    return "light";
  }
}

function apply(pref: Pref) {
  const dark = pref === "dark" || (pref === "system" && !window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// Follows the device while "Match my device" is chosen, including when the device switches at sunset.
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (readPref() === "system") apply("system");
  });
}

export function ThemeSetting() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "light" as Pref);

  function choose(next: Pref) {
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing can block storage; the choice still applies until the page is closed.
    }
    apply(next);
    listeners.forEach((cb) => cb());
  }

  return (
    <fieldset>
      <legend className="mb-3">Appearance</legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" name="theme" value={o.value} checked={pref === o.value} onChange={() => choose(o.value)} className="peer sr-only" />
            <span className="block rounded-full border border-line px-4 py-2 text-sm peer-checked:border-garnet peer-checked:bg-garnet/20 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brass">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
