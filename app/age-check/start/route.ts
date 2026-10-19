import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ageCheckEnabled, authorizeUrl } from "@/lib/age-assurance";
import { requestOrigin } from "@/lib/origin";
import { logAgeEvent } from "@/lib/age-events";

// Sends the member to AgeVerif. The random `state` is remembered in a cookie and checked on the way back,
// so a callback that this browser didn't start is refused.
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  // Never start a check from a background prefetch.
  if (request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch" || request.headers.get("sec-purpose")?.includes("prefetch")) {
    return new NextResponse(null, { status: 204 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/age-check`);
  if (!ageCheckEnabled()) return NextResponse.redirect(`${origin}/discover`);

  await logAgeEvent(user.id, "started");
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(authorizeUrl(state));
  response.cookies.set("ageverif_state", state, { maxAge: 900, path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}
