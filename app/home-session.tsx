import { Suspense, cache } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// The homepage is prerendered. These pieces read the session behind Suspense, so the page shell stays
// static and fast; visitors who are signed out see the fallback (the signed-out buttons) and nothing changes.
const getMember = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("display_name, status").eq("id", user.id).single();
  return { name: profile?.display_name ?? "", status: profile?.status ?? "incomplete" };
});

function appLink(member: { status: string }) {
  if (member.status === "incomplete") return { href: "/onboarding", label: "Finish your profile" };
  if (member.status === "pending_review") return { href: "/age-check", label: "Verify your age" };
  return { href: "/discover", label: "Open SugarMatch" };
}

function HeaderSignedOut() {
  return (
    <>
      <Link href="/login" className="btn btn-quiet !py-2 text-sm">
        Sign in
      </Link>
      <Link href="/signup" className="btn btn-primary !py-2 text-sm">
        Join free
      </Link>
    </>
  );
}

async function HeaderSession() {
  const member = await getMember();
  if (!member) return <HeaderSignedOut />;
  const { href, label } = appLink(member);
  const initial = (member.name.trim()[0] ?? "•").toUpperCase();
  return (
    <>
      <Link href="/more" aria-label="Your account" className="flex size-9 items-center justify-center rounded-full border border-brass/60 bg-velvet text-sm font-semibold text-brass hover:border-brass">
        {initial}
      </Link>
      <Link href={href} className="btn btn-primary !py-2 text-sm">
        {label}
      </Link>
    </>
  );
}

export function HeaderActions() {
  return (
    <Suspense fallback={<HeaderSignedOut />}>
      <HeaderSession />
    </Suspense>
  );
}

function HeroSignedOut() {
  return (
    <>
      <Link href="/signup" className="btn btn-primary">
        Create your free profile
      </Link>
      <a href="#how" className="btn btn-quiet">
        See how it works
      </a>
    </>
  );
}

async function HeroSession() {
  const member = await getMember();
  if (!member) return <HeroSignedOut />;
  const { href, label } = appLink(member);
  return (
    <>
      <Link href={href} className="btn btn-primary">
        {label}
      </Link>
      <a href="#how" className="btn btn-quiet">
        See how it works
      </a>
    </>
  );
}

export function HeroActions() {
  return (
    <Suspense fallback={<HeroSignedOut />}>
      <HeroSession />
    </Suspense>
  );
}

function FinalSignedOut() {
  return (
    <Link href="/signup" className="btn btn-primary mt-9">
      Create your free profile
    </Link>
  );
}

async function FinalSession() {
  const member = await getMember();
  if (!member) return <FinalSignedOut />;
  const { href, label } = appLink(member);
  return (
    <Link href={href} className="btn btn-primary mt-9">
      {label}
    </Link>
  );
}

export function FinalCta() {
  return (
    <Suspense fallback={<FinalSignedOut />}>
      <FinalSession />
    </Suspense>
  );
}
