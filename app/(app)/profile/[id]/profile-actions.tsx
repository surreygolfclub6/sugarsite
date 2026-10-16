"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "../../discover/actions";
import { MessageButton } from "../../messages/message-button";

// A heart that floats above the Message bar so liking stays one tap away while you read.
export function LikeFab({ id, name, liked: initial }: { id: string; name: string; liked: boolean }) {
  const [liked, setLiked] = useState(initial);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        setLiked(!liked);
        const data = new FormData();
        data.set("profile_id", id);
        data.set("liked", String(liked));
        startTransition(() => toggleLike(data));
      }}
      aria-pressed={liked}
      aria-label={`Like ${name}`}
      className={`fixed bottom-24 right-4 z-30 grid size-14 place-items-center rounded-full bg-pearl shadow-lg ${liked ? "text-garnet" : "text-night"}`}
    >
      <svg viewBox="0 0 24 24" className="size-7" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

export function MessageBar({ profileId, name, own }: { profileId: string; name: string; own: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-night/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto max-w-xl">
        {own ? (
          <p className="py-3 text-center text-sm text-dusk">This is how your profile looks to others.</p>
        ) : (
          <MessageButton profileId={profileId} name={name} variant="bar" />
        )}
      </div>
    </div>
  );
}
