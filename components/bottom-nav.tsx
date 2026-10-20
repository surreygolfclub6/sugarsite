"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, realtimeReady } from "@/lib/supabase/client";

const icon = "size-6";
const items = [
  {
    href: "/discover",
    label: "Search",
    match: ["/discover"],
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: "/interests",
    label: "Interests",
    match: ["/interests"],
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    match: ["/messages"],
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "More",
    match: ["/more", "/photos", "/admin"],
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    ),
  },
];

// Unread messages across all conversations, kept current over Realtime.
function useUnread(path: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const supabase = createClient();
    // A direct call (row-level security scopes it to the signed-in member) rather than a server
    // action, so it never queues behind a page refresh.
    const load = () =>
      void supabase.rpc("unread_count").then(({ data }) => alive && typeof data === "number" && setCount(data));
    load();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    void realtimeReady(supabase).then(() => {
      if (!alive) return;
      channel = supabase
        .channel(`unread-badge-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          clearTimeout(timer);
          timer = setTimeout(load, 300);
        })
        .subscribe();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [path]);
  return count;
}

export function BottomNav() {
  const path = usePathname();
  const unread = useUnread(path);
  // A profile page and an open conversation have their own bottom bars, so the tabs step aside.
  if (path.startsWith("/profile/") || /^\/messages\/[^/]+/.test(path)) return null;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-night/95 backdrop-blur">
      <ul className="mx-auto flex max-w-5xl justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = item.match.some((m) => path === m || path.startsWith(`${m}/`));
          const style = `flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs ${active ? "text-pearl" : "text-dusk"}`;
          return (
            <li key={item.label}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={`relative ${style}`}>
                {item.svg}
                {item.label}
                {item.label === "Messages" && unread > 0 && (
                  <span data-badge aria-label={`${unread} unread messages`} className="absolute right-2 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-garnet px-1 text-xs font-medium text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
