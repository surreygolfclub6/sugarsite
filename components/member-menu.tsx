"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MenuItem = { href: string; label: string; icon: "search" | "messages" | "heart" | "profile" | "shield" };

const ICONS: Record<MenuItem["icon"], string> = {
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4",
  messages: "M4 5h16v11H9l-5 4V5z",
  heart: "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8c0-4 3.6-6 8-6s8 2 8 6",
  shield: "M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6z",
};

// The compact menu for a signed-in member on the public pages: a small pill with a hamburger that opens a short
// list of places to go. The profile circle next to it is a separate link to settings.
export function MemberMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="member-menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-velvet px-3.5 py-2 text-sm font-medium hover:border-dusk"
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        Menu
      </button>
      {open && (
        <nav
          id="member-menu"
          aria-label="Member menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-line bg-velvet p-1.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.45)]"
        >
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-velvet-2"
                >
                  <svg viewBox="0 0 24 24" className="size-5 text-dusk" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={ICONS[item.icon]} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
