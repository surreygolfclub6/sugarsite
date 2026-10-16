"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { SafetyMenu } from "@/components/safety-menu";
import { createClient, realtimeReady } from "@/lib/supabase/client";
import { loadEarlier, loadSince, markRead, sendMessage, type Message } from "../actions";

type Msg = Message & { pending?: boolean };
type Other = { id: string; name: string; photo: string | null; online: boolean };

const byTime = (a: Msg, b: Msg) =>
  a.pending === b.pending ? Date.parse(a.created_at) - Date.parse(b.created_at) : a.pending ? 1 : -1;

// Times are formatted in the member's own timezone, so they only render after hydration.
const noop = () => () => {};
function Time({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noop,
    () => {
      const d = new Date(iso);
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return d.toDateString() === new Date().toDateString()
        ? time
        : `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
    },
    () => "",
  );
  return <time dateTime={iso}>{text}</time>;
}

export function Thread({
  conversationId,
  meId,
  other,
  initial,
  hasEarlier: initialHasEarlier,
}: {
  conversationId: string;
  meId: string;
  other: Other;
  initial: Message[];
  hasEarlier: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [hasEarlier, setHasEarlier] = useState(initialHasEarlier);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const anchor = useRef<number | null>(null);
  const counter = useRef(0);
  const known = useRef<Msg[]>(initial);
  useEffect(() => {
    known.current = messages;
  }, [messages]);

  const merge = useCallback((incoming: Message) => {
    setMessages((cur) =>
      cur.some((m) => m.id === incoming.id)
        ? cur.map((m) => (m.id === incoming.id ? { ...m, ...incoming } : m))
        : [...cur, incoming].sort(byTime),
    );
  }, []);

  const read = useCallback(() => {
    if (document.visibilityState === "visible") void markRead(conversationId);
  }, [conversationId]);

  // Mark what's here as read now, and again whenever the tab comes back into view.
  useEffect(() => {
    read();
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, [read]);

  useEffect(() => {
    let alive = true;
    let reconnecting = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const filter = `conversation_id=eq.${conversationId}`;
    void realtimeReady(supabase).then(() => {
      if (!alive) return;
      channel = supabase
        .channel(`thread-${conversationId}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, (payload) => {
          const message = payload.new as Message;
          merge(message);
          if (message.sender_id !== meId) read();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, (payload) => {
          merge(payload.new as Message);
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") {
            reconnecting = true;
            return;
          }
          // Back online after a drop: pick up anything we missed.
          if (reconnecting) {
            const last = [...known.current].reverse().find((m) => !m.pending);
            if (last) (await loadSince(conversationId, last.created_at)).forEach(merge);
            read();
          }
        });
    });
    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, meId, merge, read]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (anchor.current !== null) {
      el.scrollTop += el.scrollHeight - anchor.current;
      anchor.current = null;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function earlier() {
    const first = messages.find((m) => !m.pending);
    if (!first) return;
    anchor.current = scroller.current?.scrollHeight ?? null;
    const result = await loadEarlier(conversationId, first.created_at);
    setHasEarlier(result.hasMore);
    setMessages((cur) => [...result.messages.filter((m) => !cur.some((c) => c.id === m.id)), ...cur]);
  }

  async function send() {
    const body = text.trim();
    if (!body) return;
    setError(undefined);
    setText("");
    stick.current = true;
    const tmp: Msg = { id: `tmp-${++counter.current}`, sender_id: meId, body, created_at: new Date().toISOString(), read_at: null, pending: true };
    setMessages((cur) => [...cur, tmp]);

    const result = await sendMessage(conversationId, body);
    if ("error" in result) {
      setMessages((cur) => cur.filter((m) => m.id !== tmp.id));
      setText(body);
      setError(result.error);
      return;
    }
    // Realtime may already have delivered the saved row; either way keep exactly one copy.
    setMessages((cur) =>
      (cur.some((m) => m.id === result.message.id)
        ? cur.filter((m) => m.id !== tmp.id)
        : cur.map((m) => (m.id === tmp.id ? result.message : m))
      ).sort(byTime),
    );
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === meId);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-night">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2.5">
          <Link href="/messages" aria-label="Back to messages" className="grid size-10 place-items-center rounded-full hover:bg-velvet">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5m6-7-7 7 7 7" />
            </svg>
          </Link>
          <Link href={`/profile/${other.id}`} className="flex min-w-0 items-center gap-3">
            <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-velvet-2">
              {other.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.photo} alt="" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center display text-lg text-dusk">{other.name.slice(0, 1)}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{other.name}</span>
              {other.online && <span className="block text-xs text-emerald-400">Online now</span>}
            </span>
          </Link>
          <div className="ml-auto">
            <SafetyMenu profileId={other.id} name={other.name} conversationId={conversationId} />
          </div>
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto"
        aria-label="Messages"
        role="log"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-3 py-4">
          {hasEarlier && (
            <button type="button" onClick={earlier} className="btn btn-quiet mx-auto !py-1.5 text-sm">Load earlier messages</button>
          )}
          {messages.length === 0 && (
            <p className="py-10 text-center text-dusk">Say hello to {other.name}. A friendly, specific first message works best.</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <div key={m.id} data-message={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 ${mine ? "bg-garnet text-white" : "bg-velvet-2"} ${m.pending ? "opacity-60" : ""}`}>
                  {m.body}
                </p>
                <span className="mt-0.5 px-1 text-xs text-dusk">
                  <Time iso={m.created_at} />
                  {mine && m.id === lastMine?.id && (
                    <span data-receipt className="ml-2">{m.pending ? "Sending…" : m.read_at ? "Read" : "Sent"}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-line bg-night px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto max-w-2xl">
          {error && <p role="alert" className="mb-2 text-sm text-danger">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              aria-label="Write a message"
              placeholder={`Message ${other.name}`}
              maxLength={2000}
              rows={1}
              className="field max-h-36 min-h-[3rem] flex-1 resize-none [field-sizing:content]"
            />
            <button type="submit" disabled={!text.trim()} className="btn btn-primary">Send</button>
          </div>
        </div>
      </form>
    </div>
  );
}
