"use client";

import { useRef } from "react";

// A row of cards that sits in a five-column grid from 1280px up and scrolls sideways (with snapping) on narrower ones.
// The arrow buttons are for mouse users on tablet widths; phones swipe.
export function ProfileCarousel({ children, label }: { children: React.ReactNode; label: string }) {
  const list = useRef<HTMLUListElement>(null);

  function scroll(direction: 1 | -1) {
    const el = list.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = (card?.getBoundingClientRect().width ?? 260) + 16;
    el.scrollBy({ left: direction * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const arrow =
    "grid size-10 place-items-center rounded-full border border-line bg-velvet text-pearl hover:border-dusk";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4 xl:hidden">
        <p className="text-sm text-dusk">Swipe to see more</p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous profile" onClick={() => scroll(-1)} className={arrow}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" aria-label="Next profile" onClick={() => scroll(1)} className={arrow}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <ul
        ref={list}
        aria-label={label}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:gap-5 xl:overflow-visible xl:px-0 xl:pb-0"
      >
        {children}
      </ul>
    </div>
  );
}
