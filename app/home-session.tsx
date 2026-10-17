import { Suspense, cache } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MemberMenu, type MenuItem } from "@/components/member-menu";

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

// A member whose profile isn't live yet is pointed at the one step they still need; everyone else gets the main places.
function menuItems(member: { status: string }): MenuItem[] {
  if (member.status === "incomplete") return [{ href: "/onboarding", label: "Finish your profile", icon: "profile" }];
  if (member.status === "pending_review") return [{ href: "/age-check", label: "Verify your age", icon: "shield" }];
  return [
    { href: "/discover", label: "Search", icon: "search" },
    { href: "/messages", label: "Messages", icon: "messages" },
    { href: "/interests", label: "Interests", icon: "heart" },
  ];
}

async function HeaderSession() {
  const member = await getMember();
  if (!member) return <HeaderSignedOut />;
  const initial = (member.name.trim()[0] ?? "•").toUpperCase();
  return (
    <>
      <MemberMenu items={menuItems(member)} />
      <Link href="/more" aria-label="Your profile and settings" title="Profile and settings" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brass/60 bg-velvet text-sm font-semibold text-brass hover:border-brass">
        {initial}
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
