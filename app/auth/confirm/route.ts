import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/origin";
import { safeLocalPath } from "@/lib/safe-path";

const TYPES: EmailOtpType[] = ["recovery", "signup", "email", "invite", "magiclink", "email_change"];

// Email links of the form /auth/confirm?token_hash=...&type=recovery. Unlike the PKCE code link,
// this works when the email is opened on a different device from the one that asked for it.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/reset-password" : "/onboarding";
  const next = safeLocalPath(searchParams.get("next"), fallback);

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=${type === "recovery" ? "reset" : "confirmation"}`);
}
