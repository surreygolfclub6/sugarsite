"use client";

import { usePathname } from "next/navigation";

// On phones you see either the list or one conversation. From 1024px up they sit side by side: the list on the left, the open
// conversation (or a prompt to pick one) on the right.
export function MessagesShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const onIndex = usePathname() === "/messages";
  return (
    <div className="lg:flex lg:h-[calc(100dvh-8rem)] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line">
      <aside aria-label="Your conversations" className={`${onIndex ? "block" : "hidden"} lg:block lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-line xl:w-96`}>
        {list}
      </aside>
      <section className={`${onIndex ? "hidden" : "block"} min-w-0 lg:relative lg:block lg:flex-1`}>{children}</section>
    </div>
  );
}
