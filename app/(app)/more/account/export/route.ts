import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A copy of your own data. Everything is read as you, so row-level security keeps it to what's yours:
// your profile, your photos' details, your likes and blocks, and conversations you're part of.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [profile, photos, likesSent, likesReceived, blocks, conversations] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("photos").select("id, storage_path, position, moderation, rejection_reason, created_at").eq("user_id", user.id).order("position"),
    supabase.from("likes").select("to_user, created_at").eq("from_user", user.id),
    supabase.from("likes").select("from_user, created_at").eq("to_user", user.id),
    supabase.from("blocks").select("blocked, blocked_name, created_at").eq("blocker", user.id),
    supabase.from("conversations").select("id, user_a, user_b, created_at").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
  ]);

  const threads = await Promise.all(
    (conversations.data ?? []).map(async (c) => {
      const { data: messages } = await supabase
        .from("messages")
        .select("sender_id, body, created_at, read_at")
        .eq("conversation_id", c.id)
        .order("created_at");
      return {
        conversation_id: c.id,
        with_member: c.user_a === user.id ? c.user_b : c.user_a,
        started: c.created_at,
        messages: (messages ?? []).map((m) => ({ from: m.sender_id === user.id ? "you" : "them", body: m.body, sent: m.created_at, read: m.read_at })),
      };
    }),
  );

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    photos: photos.data ?? [],
    likes_sent: likesSent.data ?? [],
    likes_received: likesReceived.data ?? [],
    blocked: blocks.data ?? [],
    conversations: threads,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
