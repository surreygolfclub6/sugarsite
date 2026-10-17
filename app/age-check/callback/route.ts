import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode, expiryDate, fetchVerification, judge } from "@/lib/age-assurance";
import { requestOrigin } from "@/lib/origin";

// AgeVerif sends the member back here with ?code=&state=. The verdict is fetched server-to-server and only a
// pass makes the profile live. Nothing from the browser is trusted except the one-time code.
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const back = (error: string) => NextResponse.redirect(`${origin}/age-check?error=${error}`);
  const { searchParams } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/age-check`);

  const expected = request.cookies.get("ageverif_state")?.value;
  const done = (response: NextResponse) => {
    response.cookies.delete("ageverif_state");
    return response;
  };

  const code = searchParams.get("code");
  if (searchParams.get("error") || !code) return done(back("cancelled"));
  if (!expected || searchParams.get("state") !== expected) return done(back("state"));

  let verification;
  try {
    verification = await fetchVerification(await exchangeCode(code));
  } catch (error) {
    console.error("Age check failed", error instanceof Error ? error.message : error);
    return done(back("unavailable"));
  }

  const verdict = judge(verification);
  if (!verdict.ok) return done(back(verdict.reason));

  const admin = createAdminClient();
  const { error: saveError } = await admin.from("age_checks").upsert(
    {
      user_id: user.id,
      verification_uid: verification.uid,
      assurance_level: verification.assurance_level,
      age_threshold: verification.age_threshold,
      country: verification.country,
      reused: verification.reused,
      verified_at: new Date().toISOString(),
      expires_at: expiryDate(verification.expires_at)?.toISOString() ?? null,
    },
    { onConflict: "user_id" },
  );
  if (saveError) {
    // 23505: this verification already backs another account.
    return done(back(saveError.code === "23505" ? "used" : "unavailable"));
  }

  await admin.from("profiles").update({ status: "active" }).eq("id", user.id).eq("status", "pending_review");
  return done(NextResponse.redirect(`${origin}/discover`));
}
