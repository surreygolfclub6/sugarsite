import { Suspense } from "react";
import { ConversationList } from "./conversation-list";
import { MessagesShell } from "./messages-shell";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
    <MessagesShell
      list={
        <Suspense fallback={<div className="mt-8" aria-busy="true" />}>
          <ConversationList />
        </Suspense>
      }
    >
      {children}
    </MessagesShell>
    </Suspense>
  );
}
