import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/origin";

// Handles the link in the confirmation email.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = requestOrigin(request);
  const code = searchParams.get("code");
  const jar = await cookies();
  const resetPending = jar.has("pw_reset");
  const fallback = resetPending ? "/reset-password" : "/onboarding";
  const nextParam = searchParams.get("next") ?? fallback;
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : fallback;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      jar.delete("pw_reset");
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=confirmation`);
}
