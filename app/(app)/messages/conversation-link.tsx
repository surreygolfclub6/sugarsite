"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A row in the conversation list. On wide screens the list stays beside the open conversation, so the open one is highlighted.
export function ConversationLink({ id, children }: { id: string; children: React.ReactNode }) {
  const active = usePathname() === `/messages/${id}`;
  return (
    <Link href={`/messages/${id}`} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 px-1 py-3 lg:px-4 ${active ? "lg:bg-velvet" : "lg:hover:bg-velvet/60"}`}>
      {children}
    </Link>
  );
}
