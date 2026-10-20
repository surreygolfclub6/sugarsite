"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, useUnread } from "@/components/bottom-nav";
import { SITE_NAME } from "@/lib/config";

// The same four sections as the bottom bar, as a bar along the top for wide screens (the bottom bar steps aside from 1024px).
export function TopNav() {
  const path = usePathname();
  const unread = useUnread(path);
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-night/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/discover" className="display text-2xl">{SITE_NAME}</Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.match.some((m) => path === m || path.startsWith(`${m}/`));
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm hover:bg-velvet ${active ? "bg-velvet font-medium text-pearl" : "text-dusk"}`}
                  >
                    <span className="[&_svg]:size-5">{item.svg}</span>
                    {item.label}
                    {item.label === "Messages" && unread > 0 && (
                      <span aria-label={`${unread} unread messages`} className="grid h-5 min-w-5 place-items-center rounded-full bg-garnet px-1 text-xs font-medium text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
