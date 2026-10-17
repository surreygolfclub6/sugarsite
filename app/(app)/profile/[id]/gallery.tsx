"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function Gallery({ name, urls, menu }: { name: string; urls: string[]; menu?: React.ReactNode }) {
  const router = useRouter();
  const scroller = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-velvet-2">
      {urls.length > 0 ? (
        <ul
          ref={scroller}
          aria-label="Photos"
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {urls.map((url, i) => (
            <li key={url} className="w-full shrink-0 snap-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name}’s photo ${i + 1}`} className="aspect-[4/5] w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : (
        <div role="img" aria-label="Photo coming soon" className="grid aspect-[4/5] w-full place-items-center text-sm text-dusk">
          <span className="display text-8xl">{name.slice(0, 1)}</span>
          <span>Photo coming soon</span>
        </div>
      )}

      {urls.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-1.5" aria-hidden>
            {urls.map((url, i) => (
              <span key={url} data-dot={i === index ? "active" : "idle"} className={`size-2 rounded-full ${i === index ? "bg-white" : "bg-white/45"}`} />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">Photo {index + 1} of {urls.length}</span>
        </>
      )}

      {menu && <div className="absolute right-3 top-3">{menu}</div>}

      <button
        type="button"
        aria-label="Back"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/discover"))}
        className="absolute left-3 top-3 grid size-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M19 12H5m6-7-7 7 7 7" />
        </svg>
      </button>
    </div>
  );
}
