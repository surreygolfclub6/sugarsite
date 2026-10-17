"use client";

import { Children, useRef, useState } from "react";

// The hero's example profiles. On wide screens they sit side by side (two across from 1024px, three from 1280px).
// Below that they keep the size of a single card and scroll sideways with snapping, with the next card peeking in
// and a dot for each profile.
export function ProfileCarousel({ children, label }: { children: React.ReactNode; label: string }) {
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  function onScroll() {
    const el = list.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return;
    const step = first.getBoundingClientRect().width + 16;
    setActive(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  }

  function goTo(index: number) {
    const el = list.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div>
      <ul
        ref={list}
        aria-label={label}
        onScroll={onScroll}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-3"
      >
        {children}
      </ul>
      <div className="mt-4 flex justify-center gap-2 lg:hidden">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show profile ${i + 1} of ${count}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-garnet" : "w-2 bg-dusk/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
