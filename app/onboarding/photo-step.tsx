"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reasonLabel } from "@/lib/photo-review";

export type Photo = {
  id: string;
  path: string;
  url: string;
  moderation?: "pending" | "approved" | "rejected";
  reason?: string | null;
  visibility?: "public" | "private";
};

export const MAX_PHOTOS = 6;
const MAX_EDGE = 1600;

// crypto.randomUUID is missing on plain-http origins (e.g. over Tailscale); getRandomValues isn't.
const randomName = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

// Re-encoding through a canvas strips EXIF data (including GPS) and fixes orientation.
async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("We couldn’t read that image. Try a JPEG or PNG.");
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("We couldn’t process that image."))), "image/jpeg", 0.85),
  );
}

export function PhotoStep({ userId, initial }: { userId: string; initial: Photo[] }) {
  const [supabase] = useState(() => createClient());
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string>();
  // New photos can start out private: only you, our team and the members you choose to share with will see them.
  const [keepPrivate, setKeepPrivate] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function add(files: FileList) {
    setError(undefined);
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    let position = photos.length;
    for (const file of Array.from(files).slice(0, Math.max(room, 0))) {
      setBusy((n) => n + 1);
      try {
        if (!file.type.startsWith("image/")) throw new Error("Only image files can be added.");
        const blob = await toJpeg(file);
        const path = `${userId}/${randomName()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw new Error("The upload failed. Please try again.");
        const { data, error: rowError } = await supabase
          .from("photos")
          .insert({ user_id: userId, storage_path: path, position: position++, visibility: keepPrivate ? "private" : "public" })
          .select("id")
          .single();
        if (rowError || !data) {
          await supabase.storage.from("photos").remove([path]);
          throw new Error("We couldn’t save that photo. Please try again.");
        }
        setPhotos((p) => [...p, { id: data.id, path, url: URL.createObjectURL(blob), moderation: "pending", visibility: keepPrivate ? "private" : "public" }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  async function setVisibility(photo: Photo, visibility: "public" | "private") {
    setError(undefined);
    const { error: updateError } = await supabase.from("photos").update({ visibility }).eq("id", photo.id);
    if (updateError) return setError("We couldn’t change that photo. Please try again.");
    setPhotos((all) => all.map((x) => (x.id === photo.id ? { ...x, visibility } : x)));
  }

  async function remove(photo: Photo) {
    setError(undefined);
    const { error: rowError } = await supabase.from("photos").delete().eq("id", photo.id);
    if (rowError) return setError("We couldn’t remove that photo. Please try again.");
    await supabase.storage.from("photos").remove([photo.path]);
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dusk">
        Add 1 to {MAX_PHOTOS} photos of you. Every photo is checked by a person before anyone else can see it,
        including private ones.
      </p>
      <p className="text-sm text-dusk">
        <strong className="text-pearl">Public</strong> photos show on your profile and in search.{" "}
        <strong className="text-pearl">Private</strong> photos are only seen by you, our team and the members you choose to
        share them with. You can keep every photo private and still move up the levels.
      </p>

      <ul className="grid grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <li key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-velvet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            <input type="hidden" name="photo_id" value={p.id} />
            {p.moderation && (
              <span
                data-status={p.moderation}
                className={`absolute bottom-1.5 left-1.5 right-1.5 rounded-lg bg-black/75 px-2 py-1 text-xs ${p.moderation === "rejected" ? "text-red-300" : "text-white"}`}
              >
                {p.moderation === "pending" && "In review"}
                {p.moderation === "approved" && (p.visibility === "private" ? "Approved, private" : "Live")}
                {p.moderation === "rejected" && `Rejected: ${reasonLabel(p.reason ?? null)}`}
              </span>
            )}
            <button
              type="button"
              data-visibility={p.visibility ?? "public"}
              aria-pressed={p.visibility === "private"}
              onClick={() => setVisibility(p, p.visibility === "private" ? "public" : "private")}
              aria-label={`Photo ${i + 1} is ${p.visibility === "private" ? "private" : "public"}. Change it.`}
              className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {p.visibility === "private" ? <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></> : <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>}
              </svg>
              {p.visibility === "private" ? "Private" : "Public"}
            </button>
            <button
              type="button"
              onClick={() => remove(p)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/70 text-sm text-white"
            >
              ×
            </button>
          </li>
        ))}
        {busy > 0 && (
          <li className="grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-line text-sm text-dusk" aria-busy="true">
            Uploading…
          </li>
        )}
      </ul>

      {photos.length < MAX_PHOTOS && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={keepPrivate} onChange={(e) => setKeepPrivate(e.target.checked)} className="mt-1 size-4" />
            <span>Keep new photos private. I’ll choose who sees them.</span>
          </label>
          <label htmlFor="photo_files" className="btn btn-quiet cursor-pointer">
            Add photos
          </label>
          <input
            ref={input}
            id="photo_files"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => e.target.files && add(e.target.files)}
          />
        </div>
      )}

      <div aria-live="polite">{error && <p className="text-sm text-danger">{error}</p>}</div>
    </div>
  );
}
