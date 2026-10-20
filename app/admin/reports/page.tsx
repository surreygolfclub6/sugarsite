import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { ageFrom } from "@/lib/people";
import { reportReasonLabel } from "@/lib/safety";
import { SITE_NAME } from "@/lib/config";
import { AdminNav } from "../admin-nav";
import { resolveReport } from "../actions";

export const metadata: Metadata = { title: "Reports" };

async function Reports() {
  await connection();
  const { admin } = await requireAdmin();

  const { data: open } = await admin
    .from("reports")
    .select("id, reporter, reported, reason, details, source, conversation_id, created_at")
    .eq("status", "open")
    .order("created_at");
  // Possible under-18s first, then oldest first.
  const reports = [...(open ?? [])].sort(
    (a, b) => Number(b.reason === "underage") - Number(a.reason === "underage") || a.created_at.localeCompare(b.created_at),
  );

  const peopleIds = [...new Set(reports.flatMap((r) => [r.reporter, r.reported]))];
  const { data: people } = peopleIds.length
    ? await admin.from("profiles").select("id, display_name, birthdate, gender, city, headline, bio, status").in("id", peopleIds)
    : { data: [] };
  const person = (id: string) => people?.find((p) => p.id === id);
  const againstCount = (id: string) => reports.filter((r) => r.reported === id).length;

  // Photos the reported member has uploaded (any state), so a moderator can judge for themselves.
  const reportedIds = [...new Set(reports.map((r) => r.reported))];
  const { data: photos } = reportedIds.length
    ? await admin.from("photos").select("user_id, storage_path").in("user_id", reportedIds).order("position")
    : { data: [] };
  const { data: signed } = photos?.length
    ? await admin.storage.from("photos").createSignedUrls(photos.map((p) => p.storage_path), 600)
    : { data: [] };
  const urlsFor = (id: string) =>
    (photos ?? []).filter((p) => p.user_id === id).flatMap((p) => signed?.find((s) => s.path === p.storage_path)?.signedUrl ?? []).slice(0, 4);

  // The conversation a report was filed from, read by the service role for moderation.
  const conversations = new Map<string, { sender_id: string; body: string; created_at: string }[]>();
  for (const r of reports) {
    if (!r.conversation_id) continue;
    const { data } = await admin
      .from("messages")
      .select("sender_id, body, created_at")
      .eq("conversation_id", r.conversation_id)
      .order("created_at", { ascending: false })
      .limit(30);
    conversations.set(r.id, (data ?? []).reverse());
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:max-w-6xl">
      <Link href="/discover" className="display text-2xl lg:hidden">{SITE_NAME}</Link>
      <Suspense fallback={null}>
        <AdminNav current="reports" />
      </Suspense>
      <h1 className="display mt-8 text-4xl">Reports</h1>
      <p className="mt-3 text-dusk">
        {reports.length === 0
          ? "No open reports."
          : `${reports.length} open ${reports.length === 1 ? "report" : "reports"}. Possible under-18s come first, then oldest.`}
      </p>

      <ul className="mt-8 space-y-8">
        {reports.map((r) => {
          const who = person(r.reported);
          const by = person(r.reporter);
          const thread = conversations.get(r.id);
          return (
            <li key={r.id} data-report={r.id} className={`rounded-2xl border p-5 ${r.reason === "underage" ? "border-danger" : "border-line"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="display text-2xl">{reportReasonLabel(r.reason)}</h2>
                <p className="text-sm text-dusk">
                  Reported by {by?.display_name ?? "a member"} · {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                  {r.source === "message" ? "from a conversation" : "from a profile"}
                </p>
              </div>
              {r.details && <p className="mt-3 whitespace-pre-line rounded-xl bg-velvet px-4 py-3">{r.details}</p>}

              <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
              <section aria-label="Reported member" className="mt-5">
                <p className="font-medium">
                  {who?.display_name ?? "Unknown"}
                  {who?.birthdate && `, ${ageFrom(who.birthdate)}`}{" "}
                  <span className="text-sm text-dusk">· {who?.city} · {who?.status}</span>
                </p>
                {who?.headline && <p className="mt-1 text-sm">{who.headline}</p>}
                {who?.bio && <p className="mt-1 whitespace-pre-line text-sm text-dusk">{who.bio}</p>}
                {againstCount(r.reported) > 1 && (
                  <p className="mt-2 text-sm text-danger">{againstCount(r.reported)} open reports against this member.</p>
                )}
                {urlsFor(r.reported).length > 0 && (
                  <ul className="mt-3 flex gap-2" aria-label="Their photos">
                    {urlsFor(r.reported).map((url) => (
                      <li key={url}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Reported member’s photo" className="h-28 w-20 rounded-lg border border-line object-cover" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {thread && (
                <section aria-label="Conversation" className="mt-5">
                  <h3 className="text-sm font-medium text-dusk">Conversation (latest {thread.length} messages)</h3>
                  <ul className="mt-2 space-y-1 rounded-xl bg-velvet px-4 py-3 text-sm">
                    {thread.map((m, i) => (
                      <li key={i}>
                        <span className="text-dusk">{m.sender_id === r.reported ? who?.display_name : by?.display_name}:</span> {m.body}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              </div>

              <form action={resolveReport} className="mt-6 flex flex-wrap gap-3">
                <input type="hidden" name="report_id" value={r.id} />
                <button name="outcome" value="suspend" className="btn btn-primary">Suspend member</button>
                <button name="outcome" value="actioned" className="btn btn-quiet">Mark actioned</button>
                <button name="outcome" value="dismissed" className="btn btn-quiet">Dismiss</button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-4xl px-5 py-8" aria-busy="true" />}>
      <Reports />
    </Suspense>
  );
}
