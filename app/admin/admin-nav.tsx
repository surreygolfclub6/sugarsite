import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export async function AdminNav({ current }: { current: "approvals" | "photos" | "reports" | "members" | "security" }) {
  const { admin } = await requireAdmin();
  const [{ count: approvals }, { data: pending }, { count: reports }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "awaiting_approval"),
    admin.from("photos").select("user_id").eq("moderation", "pending"),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const photoProfiles = new Set((pending ?? []).map((p) => p.user_id)).size;

  const tab = (href: string, label: string, n: number, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-4 py-3 text-sm ${active ? "border-pearl text-pearl" : "border-transparent text-dusk"}`}
    >
      {label}
      {n > 0 && <span className="ml-2 rounded-full bg-garnet px-2 py-0.5 text-xs text-white">{n}</span>}
    </Link>
  );

  return (
    <nav aria-label="Admin" className="mt-6 flex overflow-x-auto border-b border-line">
      {tab("/admin/approvals", "Approvals", approvals ?? 0, current === "approvals")}
      {tab("/admin", "Photos", photoProfiles, current === "photos")}
      {tab("/admin/reports", "Reports", reports ?? 0, current === "reports")}
      {tab("/admin/members", "Members", 0, current === "members")}
      {tab("/admin/mfa", "Security", 0, current === "security")}
    </nav>
  );
}
