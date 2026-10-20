"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { FREE_NEW_CONVERSATIONS_PER_DAY } from "@/lib/config";
import { withPhotoUrls } from "@/lib/chat-photos";
import { notifyNewMessage } from "@/lib/notify";

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  photo_id: string | null;
  photo_url?: string | null;
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
  photoId?: string,
): Promise<{ message: Message } | { error: string }> {
  const { supabase, user } = await signedIn();
  const parsed = z
    .object({ id: uuid, body: z.string().trim().max(2000), photo: uuid.optional() })
    .refine((v) => v.body.length > 0 || v.photo, "empty")
    .safeParse({ id: conversationId, body, photo: photoId });
  if (!parsed.success) return { error: "Write a message of up to 2,000 characters." };

  // Row-level security checks you're in the conversation, not blocked, and entitled to message.
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: parsed.data.id, sender_id: user.id, body: parsed.data.body, photo_id: parsed.data.photo ?? null })
    .select("id, sender_id, body, created_at, read_at, photo_id")
    .single();
  if (error || !data) {
    return {
      error: error?.message.includes("too quickly")
        ? "You’re sending messages too quickly. Wait a moment."
        : "We couldn’t send that. You may no longer be able to message this member.",
    };
  }
  const [message] = await withPhotoUrls(supabase, [data]);
  // The email goes out after the reply is sent, so sending a message never waits on it (or fails because of it).
  after(() => notifyNewMessage(parsed.data.id, user.id).catch(() => {}));
  return { message };
}

// A photo sent to you arrives over realtime without its URL, so fetch the one message's URL here.
export async function photoUrl(conversationId: string, photoId: string): Promise<string | null> {
  const { supabase } = await signedIn();
  const parsed = z.object({ c: uuid, p: uuid }).safeParse({ c: conversationId, p: photoId });
  if (!parsed.success) return null;
  // Only a photo that is part of this conversation.
  const { data: m } = await supabase.from("messages").select("photo_id").eq("conversation_id", parsed.data.c).eq("photo_id", parsed.data.p).limit(1).maybeSingle();
  if (!m) return null;
  const [row] = await withPhotoUrls(supabase, [{ photo_id: parsed.data.p }]);
  return row.photo_url;
}

// Deletes a conversation for you only. The other person keeps theirs; moderators can still see it if it was reported.
export async function deleteConversation(conversationId: string): Promise<{ error: string } | void> {
  const { supabase } = await signedIn();
  const id = uuid.safeParse(conversationId);
  if (!id.success) return { error: "We couldn’t delete that conversation." };
  const { error } = await supabase.rpc("clear_conversation", { conv: id.data });
  if (error) return { error: "We couldn’t delete that conversation. Please try again." };
  // The conversation list lives in the messages layout, which isn't re-fetched by a plain navigation.
  revalidatePath("/messages", "layout");
  redirect(`/messages?deleted=${Date.now()}`);
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
    .select("id, sender_id, body, created_at, read_at, photo_id")
    .eq("conversation_id", parsed.data.id)
    .lt("created_at", parsed.data.before)
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  const rows = data ?? [];
  return { messages: await withPhotoUrls(supabase, rows.slice(0, PAGE).reverse()), hasMore: rows.length > PAGE };
}

// After a dropped connection, fetch whatever arrived while we weren't listening.
export async function loadSince(conversationId: string, after: string) {
  const { supabase } = await signedIn();
  const parsed = z.object({ id: uuid, after: z.string().datetime({ offset: true }) }).safeParse({ id: conversationId, after });
  if (!parsed.success) return [] as Message[];
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at, photo_id")
    .eq("conversation_id", parsed.data.id)
    .gt("created_at", parsed.data.after)
    .order("created_at")
    .limit(100);
  return withPhotoUrls(supabase, data ?? []);
}
