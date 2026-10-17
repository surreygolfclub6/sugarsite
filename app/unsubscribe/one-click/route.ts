import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validUnsubscribe } from "@/lib/unsubscribe";

// Mail apps call this (the List-Unsubscribe-Post header) when someone presses "Unsubscribe" in their inbox.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(u) || !validUnsubscribe(u, t)) return new NextResponse("Invalid link", { status: 400 });
  await createAdminClient().from("profiles").update({ email_notifications: false }).eq("id", u);
  return new NextResponse("Unsubscribed", { status: 200 });
}
