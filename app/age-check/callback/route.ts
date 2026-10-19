import { after, NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode, expiryDate, fetchVerification, judge } from "@/lib/age-assurance";
import { requestOrigin } from "@/lib/origin";
import { approvalRequired } from "@/lib/approval";
import { notifyAdminsNewMember } from "@/lib/admin-notify";
import { sendWelcome } from "@/lib/welcome";
import { logAgeEvent } from "@/lib/age-events";

// AgeVerif sends the member back here with ?code=&state=. The verdict is fetched server-to-server and only a
// pass makes the profile live. Nothing from the browser is trusted except the one-time code.
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  // Logs why it didn't pass and hands the member a short reference to quote to support.
  const back = async (error: string, userId?: string, detail?: Record<string, unknown>) => {
    const ref = userId ? await logAgeEvent(userId, error, detail) : null;
    return NextResponse.redirect(`${origin}/age-check?error=${error}${ref ? `&ref=${ref}` : ""}`);
  };
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
  if (searchParams.get("error") || !code) return done(await back("cancelled", user.id, { provider_error: searchParams.get("error") }));
  if (!expected || searchParams.get("state") !== expected) return done(await back("state", user.id, { cookie_present: !!expected }));

  let verification;
  try {
    verification = await fetchVerification(await exchangeCode(code));
  } catch (error) {
    console.error("Age check failed", error instanceof Error ? error.message : error);
    return done(await back("unavailable", user.id, { error: error instanceof Error ? error.message : "unknown" }));
  }

  const verdict = judge(verification);
  if (!verdict.ok) {
    return done(
      await back(verdict.reason, user.id, {
        verified: verification.verified,
        assurance_level: verification.assurance_level,
        age_threshold: verification.age_threshold,
        country: verification.country,
        expires_at: verification.expires_at,
      }),
    );
  }

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
    return done(await back(saveError.code === "23505" ? "used" : "unavailable", user.id, { code: saveError.code }));
  }

  // Passing the check makes the profile live, unless new members have to be approved first.
  const needsApproval = await approvalRequired();
  await admin
    .from("profiles")
    .update({ status: needsApproval ? "awaiting_approval" : "active", age_verified: true })
    .eq("id", user.id)
    .eq("status", "pending_review");
  await logAgeEvent(user.id, "passed", { assurance_level: verification.assurance_level, country: verification.country });
  after(() => notifyAdminsNewMember(user.id).catch(() => {}));
  if (!needsApproval) after(() => sendWelcome(user.id).catch(() => {}));
  return done(NextResponse.redirect(`${origin}${needsApproval ? "/awaiting-approval" : "/discover"}`));
}
