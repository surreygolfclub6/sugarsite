"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, realtimeReady } from "@/lib/supabase/client";

// Keeps the conversation list live: any message in or out of one of your conversations refreshes it.
export function RefreshOnMessage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    void realtimeReady(supabase).then(() => {
      if (!alive) return;
      channel = supabase
        .channel(`conversation-list-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 250);
        })
        .subscribe();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null;
}
