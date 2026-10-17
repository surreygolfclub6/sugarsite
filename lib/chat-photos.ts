import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = { photo_id: string | null };

// Photos sent in a chat live in the private bucket, so the server signs a short-lived URL for each one. Row-level
// security decides which of these photos the signed-in member may see (their own, or ones sent to them in a chat), and a
// photo they can't see simply gets no URL.
export async function withPhotoUrls<T extends Row>(supabase: Supabase, rows: T[]): Promise<(T & { photo_url: string | null })[]> {
  const ids = [...new Set(rows.flatMap((r) => (r.photo_id ? [r.photo_id] : [])))];
  const { data: photos } = ids.length ? await supabase.from("photos").select("id, storage_path").in("id", ids) : { data: [] };
  const { data: signed } = photos?.length
    ? await createAdminClient().storage.from("photos").createSignedUrls(photos.map((p) => p.storage_path), 3600)
    : { data: [] };
  const urlById = new Map((photos ?? []).map((p) => [p.id, signed?.find((s) => s.path === p.storage_path)?.signedUrl ?? null]));
  return rows.map((r) => ({ ...r, photo_url: r.photo_id ? (urlById.get(r.photo_id) ?? null) : null }));
}
