import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { after, connection } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { touchActive } from "@/lib/activity";
import { isOnline } from "@/lib/people";
import { firstPhotos } from "../../discover/search";
import { Thread } from "./thread";

export const metadata: Metadata = { title: "Conversation" };
const PAGE = 30;

async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Recording activity is a write the page doesn't wait on, so it runs after the response is sent.
  after(() => touchActive(user.id));

  // Row-level security only returns conversations you're part of, so anyone else gets a 404.
  const { data: conversation } = await supabase.from("conversations").select("id, user_a, user_b").eq("id", id).single();
  if (!conversation) notFound();
  const otherId = conversation.user_a === user.id ? conversation.user_b : conversation.user_a;

  // The other member is hidden by RLS if they're suspended or blocked, which ends the conversation.
  const { data: other } = await supabase.from("profiles").select("id, display_name, last_active_at").eq("id", otherId).single();
  if (!other) notFound();

  const { data: latest } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  const rows = latest ?? [];
  const photo = (await firstPhotos(supabase, [otherId])).get(otherId)?.url ?? null;

  return (
    <Thread
      conversationId={id}
      meId={user.id}
      other={{ id: other.id, name: other.display_name ?? "Member", photo, online: isOnline(other.last_active_at) }}
      initial={rows.slice(0, PAGE).reverse()}
      hasEarlier={rows.length > PAGE}
    />
  );
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-40 bg-night" aria-busy="true" />}>
      <Conversation params={params} />
    </Suspense>
  );
}
