import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { SITE_NAME } from "@/lib/config";
import { AdminNav } from "../admin-nav";
import { setTester } from "../actions";
import { OUTCOME_LABELS } from "@/lib/age-events";

export const metadata: Metadata = { title: "Members" };

const PAGE_SIZE = 25;
const STATUSES = ["incomplete", "pending_review", "awaiting_approval", "active", "declined", "suspended"] as const;
const STATUS_LABEL: Record<string, string> = {
  incomplete: "Setting up",
  pending_review: "Age check",
  awaiting_approval: "Awaiting approval",
  active: "Active",
  declined: "Declined",
  suspended: "Suspended",
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Members({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const { admin } = await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const status = STATUSES.find((s) => s === one(sp.status));
  const tester = one(sp.tester) === "1";
  const page = Math.max(1, Math.min(500, Number(one(sp.page)) || 1));

  // An email search looks the address up first; a name search is done in the database.
  let emailIds: string[] | null = null;
  if (q.includes("@")) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    emailIds = (data?.users ?? []).filter((u) => u.email?.toLowerCase().includes(q.toLowerCase())).map((u) => u.id);
  }

  let query = admin
    .from("profiles")
    .select("id, display_name, status, age_verified, is_tester, created_at, last_active_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (tester) query = query.eq("is_tester", true);
  if (emailIds) query = query.in("id", emailIds.length ? emailIds : ["00000000-0000-0000-0000-000000000000"]);
  else if (q) query = query.ilike("display_name", `%${q.replace(/[%_,]/g, " ")}%`);
  const { data: members, count } = await query;

  const rows = await Promise.all(
    (members ?? []).map(async (m) => {
      const [{ data: u }, { data: level }, { data: checks }] = await Promise.all([
        admin.auth.admin.getUserById(m.id),
        admin.rpc("member_tier", { uid: m.id }),
        m.status === "pending_review" ? admin.from("age_check_events").select("outcome, created_at").eq("user_id", m.id).order("created_at", { ascending: false }).limit(1) : Promise.resolve({ data: null }),
      ]);
      return { ...m, email: u.user?.email ?? "", level: (level as string | null) ?? "newcomer", lastCheck: checks?.[0] ?? null };
    }),
  );
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (p: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    if (tester) next.set("tester", "1");
    if (p > 1) next.set("page", String(p));
    const s = next.toString();
    return `/admin/members${s ? `?${s}` : ""}`;
  };
  const here = link(page);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <Link href="/discover" className="display text-2xl">{SITE_NAME}</Link>
      <Suspense fallback={null}>
        <AdminNav current="members" />
      </Suspense>
      <h1 className="display mt-8 text-4xl">Members</h1>
      <p className="mt-3 text-dusk">
        {count ?? 0} {count === 1 ? "member" : "members"}. A tester gets Champion limits, whatever their record, so they can try everything.
      </p>

      <form role="search" aria-label="Find members" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm">
          <span className="block text-dusk">Name or email</span>
          <input name="q" defaultValue={q} maxLength={80} className="field mt-1 w-full" placeholder="Search" />
        </label>
        <label className="text-sm">
          <span className="block text-dusk">Status</span>
          <select name="status" defaultValue={status ?? ""} className="field mt-1">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-3 text-sm">
          <input type="checkbox" name="tester" value="1" defaultChecked={tester} className="size-4 accent-garnet" /> Testers only
        </label>
        <button className="btn btn-primary">Filter</button>
      </form>

      <div className="relative mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-dusk">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3 font-medium"><span className="sr-only">Tester</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((m) => (
              <tr key={m.id} data-member={m.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {m.display_name ?? "No name yet"}
                    {m.age_verified && <span className="ml-2 rounded-full border border-brass px-2 py-0.5 text-[10px] font-normal text-brass">Age verified</span>}
                  </p>
                  <p className="break-all text-xs text-dusk">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[m.status] ?? m.status}
                  {m.status === "pending_review" && (
                    <p className="text-xs text-dusk">
                      {m.lastCheck ? `Last try: ${OUTCOME_LABELS[m.lastCheck.outcome] ?? m.lastCheck.outcome}, ${new Date(m.lastCheck.created_at).toLocaleDateString("en-GB")}` : "Hasn't started the check"}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 capitalize">
                  {m.level}
                  {m.is_tester && <span className="ml-2 rounded-full bg-garnet px-2 py-0.5 text-[10px] text-white">Tester</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-dusk">{new Date(m.created_at).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 whitespace-nowrap text-dusk">{m.last_active_at ? new Date(m.last_active_at).toLocaleDateString("en-GB") : "Never"}</td>
                <td className="px-4 py-3 text-right">
                  <form action={setTester}>
                    <input type="hidden" name="profile_id" value={m.id} />
                    <input type="hidden" name="tester" value={m.is_tester ? "off" : "on"} />
                    <input type="hidden" name="back" value={here} />
                    <button className="btn btn-quiet !px-3 !py-1.5 text-xs whitespace-nowrap">{m.is_tester ? "Remove tester" : "Make tester"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dusk">No members match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="btn btn-quiet">Previous</Link> : <span />}
          <span className="text-dusk">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="btn btn-quiet">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

export default function MembersPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-5xl px-5 py-8" aria-busy="true" />}>
      <Members searchParams={searchParams} />
    </Suspense>
  );
}
