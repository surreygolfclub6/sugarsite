"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AgeBadge } from "@/components/age-badge";
import { MessageButton } from "../messages/message-button";
import { loadMoreProfiles, toggleLike } from "./actions";
import type { Card } from "./search";

export function TileGrid({
  initialCards,
  initialHasNext,
  query,
}: {
  initialCards: Card[];
  initialHasNext: boolean;
  query: string;
}) {
  const [cards, setCards] = useState(initialCards);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const page = useRef(1);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const next = await loadMoreProfiles(query, page.current + 1);
      page.current += 1;
      setCards((current) => {
        const seen = new Set(current.map((c) => c.id));
        return [...current, ...next.cards.filter((c) => !seen.has(c.id))];
      });
      setHasNext(next.hasNext);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNext) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNext, loadMore, cards.length]);

  function like(card: Card) {
    setCards((all) => all.map((c) => (c.id === card.id ? { ...c, liked: !c.liked } : c)));
    const data = new FormData();
    data.set("profile_id", card.id);
    data.set("liked", String(card.liked));
    startTransition(() => toggleLike(data));
  }

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4" data-results>
        {cards.map((c) => (
          <li key={c.id} data-card={c.id} className="overflow-hidden rounded-2xl border border-line bg-velvet">
            <Link href={`/profile/${c.id}`} className="relative block aspect-[3/4] bg-velvet-2">
              {c.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photo} alt={`${c.display_name}’s photo`} loading="lazy" className="size-full object-cover" />
              ) : (
                <div role="img" aria-label="Photo coming soon" className="grid size-full place-items-center text-center text-xs text-dusk">
                  <span className="display text-6xl">{c.display_name.slice(0, 1)}</span>
                  <span>Photo coming soon</span>
                </div>
              )}
              {c.photo_count > 0 && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white" aria-label={`${c.photo_count} photos`}>
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
                    <path d="M9 4 7.6 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.6L15 4H9zm3 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" />
                  </svg>
                  {c.photo_count}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-10 text-white">
                <p className="flex items-center gap-1.5 font-medium">
                  {c.online && <span role="img" aria-label="Online now" className="size-2.5 shrink-0 rounded-full bg-emerald-500" />}
                  <span className="truncate">{c.display_name}</span>
                  {c.age_verified && <AgeBadge className="size-[18px]" />}
                </p>
                <p className="truncate text-xs text-white/80">
                  {c.age} · {c.city}
                </p>
              </div>
            </Link>
            <div className="flex items-center justify-around py-1.5">
              <MessageButton profileId={c.id} name={c.display_name} variant="icon" />
              <button
                type="button"
                onClick={() => like(c)}
                aria-pressed={c.liked}
                aria-label={`Like ${c.display_name}`}
                className={`p-2 ${c.liked ? "text-garnet" : "text-dusk"}`}
              >
                <svg viewBox="0 0 24 24" className="size-6" fill={c.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div ref={sentinel} className="py-10 text-center text-sm text-dusk" aria-live="polite">
        {hasNext ? (loading ? "Loading more…" : "") : <span data-end>That’s everyone for now.</span>}
      </div>
    </>
  );
}
