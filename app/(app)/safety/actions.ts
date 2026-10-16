"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/safety";

const uuid = z.string().uuid();

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function addBlock(supabase: Awaited<ReturnType<typeof createClient>>, me: string, other: string) {
  // Read the name first: once blocked, row-level security hides their profile from you.
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", other).single();
  const { error } = await supabase
    .from("blocks")
    .upsert({ blocker: me, blocked: other, blocked_name: profile?.display_name ?? "Member" }, { onConflict: "blocker,blocked", ignoreDuplicates: true });
  return { name: profile?.display_name ?? "Member", error };
}

export async function blockMember(profileId: string): Promise<{ error: string }> {
  const { supabase, user } = await signedIn();
  const id = uuid.safeParse(profileId);
  if (!id.success || id.data === user.id) return { error: "You can’t block this member." };

  const { name, error } = await addBlock(supabase, user.id, id.data);
  if (error) return { error: "We couldn’t block them. Please try again." };
  redirect(`/discover?blocked=${encodeURIComponent(name.slice(0, 40))}`);
}

export async function unblockMember(formData: FormData) {
  const { supabase, user } = await signedIn();
  const id = uuid.safeParse(formData.get("profile_id"));
  if (!id.success) return;
  await supabase.from("blocks").delete().eq("blocker", user.id).eq("blocked", id.data);
  revalidatePath("/more/blocked");
}

export type ReportResult = { ok: true; blocked: boolean } | { error: string };

export async function reportMember(input: {
  profileId: string;
  reason: string;
  details: string;
  conversationId?: string;
  alsoBlock: boolean;
}): Promise<ReportResult> {
  const { supabase, user } = await signedIn();
  const parsed = z
    .object({
      profileId: uuid,
      reason: z.enum(REPORT_REASONS.map((r) => r.value) as [string, ...string[]]),
      details: z.string().trim().max(1000),
      conversationId: uuid.optional(),
      alsoBlock: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Choose a reason, and keep details under 1,000 characters." };
  const { profileId, reason, details, conversationId, alsoBlock } = parsed.data;
  if (profileId === user.id) return { error: "You can’t report yourself." };
  if (reason === "other" && details.length < 10) return { error: "Please tell us a little more so we can look into it." };

  // Only attach a conversation you're really in with this member (row-level security enforces
  // the first part; we check the other person is the one reported).
  let attached: string | null = null;
  if (conversationId) {
    const { data: conversation } = await supabase.from("conversations").select("id, user_a, user_b").eq("id", conversationId).single();
    if (conversation && [conversation.user_a, conversation.user_b].includes(profileId)) attached = conversation.id;
  }

  const { error } = await supabase.from("reports").insert({
    reporter: user.id,
    reported: profileId,
    reason,
    details: details || null,
    source: attached ? "message" : "profile",
    conversation_id: attached,
  });
  if (error) {
    if (error.code === "23505") return { error: "You’ve already reported this member. Our team is reviewing it." };
    if (error.message.includes("too many reports")) return { error: "You’ve sent a lot of reports today. Please try again tomorrow." };
    return { error: "We couldn’t send your report. Please try again." };
  }

  if (alsoBlock) await addBlock(supabase, user.id, profileId);
  return { ok: true, blocked: alsoBlock };
}
