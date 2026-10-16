"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { FREE_NEW_CONVERSATIONS_PER_DAY } from "@/lib/config";

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const uuid = z.string().uuid();
const PAGE = 30;

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Opens the thread with someone, creating the conversation if it's new. The database function
// checks both profiles are live, nobody has blocked anybody, and the daily limit on new chats.
export async function openConversation(otherId: string): Promise<{ error: string }> {
  const { supabase } = await signedIn();
  const id = uuid.safeParse(otherId);
  if (!id.success) return { error: "This member is not available" };

  const { data, error } = await supabase.rpc("start_conversation", {
    other: id.data,
    daily_cap: FREE_NEW_CONVERSATIONS_PER_DAY,
  });
  if (error || !data) return { error: error?.message ?? "We couldn’t start that conversation." };
  redirect(`/messages/${data}`);
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ message: Message } | { error: string }> {
  const { supabase, user } = await signedIn();
  const parsed = z
    .object({ id: uuid, body: z.string().trim().min(1).max(2000) })
    .safeParse({ id: conversationId, body });
  if (!parsed.success) return { error: "Write a message of up to 2,000 characters." };

  // Row-level security checks you're in the conversation, not blocked, and entitled to message.
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: parsed.data.id, sender_id: user.id, body: parsed.data.body })
    .select("id, sender_id, body, created_at, read_at")
    .single();
  if (error || !data) {
    return {
      error: error?.message.includes("too quickly")
        ? "You’re sending messages too quickly. Wait a moment."
        : "We couldn’t send that. You may no longer be able to message this member.",
    };
  }
  return { message: data };
}

export async function markRead(conversationId: string) {
  const { supabase, user } = await signedIn();
  const id = uuid.safeParse(conversationId);
  if (!id.success) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id.data)
    .neq("sender_id", user.id)
    .is("read_at", null);
}

export async function loadEarlier(conversationId: string, before: string) {
  const { supabase } = await signedIn();
  const parsed = z.object({ id: uuid, before: z.string().datetime({ offset: true }) }).safeParse({ id: conversationId, before });
  if (!parsed.success) return { messages: [] as Message[], hasMore: false };

  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", parsed.data.id)
    .lt("created_at", parsed.data.before)
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  const rows = data ?? [];
  return { messages: rows.slice(0, PAGE).reverse(), hasMore: rows.length > PAGE };
}

// After a dropped connection, fetch whatever arrived while we weren't listening.
export async function loadSince(conversationId: string, after: string) {
  const { supabase } = await signedIn();
  const parsed = z.object({ id: uuid, after: z.string().datetime({ offset: true }) }).safeParse({ id: conversationId, after });
  if (!parsed.success) return [] as Message[];
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", parsed.data.id)
    .gt("created_at", parsed.data.after)
    .order("created_at")
    .limit(100);
  return data ?? [];
}
