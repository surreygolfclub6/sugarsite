"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { blockMember, reportMember } from "@/app/(app)/safety/actions";
import { deleteConversation } from "@/app/(app)/messages/actions";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REASONS } from "@/lib/safety";

// In a conversation the menu also carries your private-photo sharing with this person, and deleting the conversation.
type Props = {
  profileId: string;
  name: string;
  conversationId?: string;
  privateSharing?: { meId: string; canShare: boolean; shared: boolean };
};

const dialogStyle =
  "m-auto w-[min(92vw,28rem)] rounded-2xl border border-line bg-velvet p-5 text-pearl backdrop:bg-black/70";

// The "..." menu on a profile or conversation: report or block that member.
export function SafetyMenu({ profileId, name, conversationId, privateSharing }: Props) {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(privateSharing?.shared ?? false);
  const [sharing, setSharing] = useState<string>();
  const shareDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const blockDialog = useRef<HTMLDialogElement>(null);
  const reportDialog = useRef<HTMLDialogElement>(null);

  // Stopping takes one tap; sharing asks first (see ShareDialog).
  async function stopSharing() {
    if (!privateSharing) return;
    setOpen(false);
    const { error } = await createClient().from("photo_shares").delete().eq("owner_id", privateSharing.meId).eq("viewer_id", profileId);
    if (!error) setShared(false);
    setSharing(error ? "We couldn’t stop sharing. Please try again." : `You’ve stopped sharing your private photos with ${name}.`);
    setTimeout(() => setSharing(undefined), 4000);
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`More options for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-velvet shadow-lg">
          {privateSharing && (shared || privateSharing.canShare) && (
            <li role="none">
              {shared ? (
                <button role="menuitem" type="button" className="w-full px-4 py-3 text-left hover:bg-velvet-2" onClick={stopSharing}>
                  Stop sharing private photos
                </button>
              ) : (
                <button role="menuitem" type="button" className="w-full px-4 py-3 text-left hover:bg-velvet-2" onClick={() => { setOpen(false); shareDialog.current?.showModal(); }}>
                  Share private photos
                </button>
              )}
            </li>
          )}
          {conversationId && (
            <li role="none">
              <button role="menuitem" type="button" className="w-full px-4 py-3 text-left hover:bg-velvet-2" onClick={() => { setOpen(false); deleteDialog.current?.showModal(); }}>
                Delete conversation
              </button>
            </li>
          )}
          <li role="none">
            <button role="menuitem" type="button" className="w-full px-4 py-3 text-left hover:bg-velvet-2" onClick={() => { setOpen(false); reportDialog.current?.showModal(); }}>
              Report {name}
            </button>
          </li>
          <li role="none">
            <button role="menuitem" type="button" className="w-full px-4 py-3 text-left text-danger hover:bg-velvet-2" onClick={() => { setOpen(false); blockDialog.current?.showModal(); }}>
              Block {name}
            </button>
          </li>
        </ul>
      )}
      {sharing && <p role="status" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-velvet px-4 py-3 text-sm shadow-lg">{sharing}</p>}
      {privateSharing && (
        <ShareDialog
          dialogRef={shareDialog}
          meId={privateSharing.meId}
          otherId={profileId}
          name={name}
          onShared={() => {
            setShared(true);
            setSharing(`${name} can now see your private photos.`);
            setTimeout(() => setSharing(undefined), 4000);
          }}
        />
      )}
      {conversationId && <DeleteDialog dialogRef={deleteDialog} conversationId={conversationId} name={name} />}
      <BlockDialog dialogRef={blockDialog} profileId={profileId} name={name} />
      <ReportDialog dialogRef={reportDialog} profileId={profileId} name={name} conversationId={conversationId} />
    </div>
  );
}

export function ShareDialog({ dialogRef, meId, otherId, name, onShared }: { dialogRef: React.RefObject<HTMLDialogElement | null>; meId: string; otherId: string; name: string; onShared: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function share() {
    setBusy(true);
    setError(undefined);
    const { error: failed } = await createClient().from("photo_shares").insert({ owner_id: meId, viewer_id: otherId });
    setBusy(false);
    if (failed && failed.code !== "23505") return setError("We couldn’t share. Please try again.");
    dialogRef.current?.close();
    onShared();
  }
  return (
    <dialog ref={dialogRef} aria-labelledby="share-title" className={dialogStyle}>
      <h2 id="share-title" className="display text-2xl">Share private photos with {name}?</h2>
      <p className="mt-3 text-dusk">
        {name} will be able to see all your private photos until you stop sharing. Anyone who can see a photo could save
        it, so only share with people you trust.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" className="btn btn-quiet" onClick={() => dialogRef.current?.close()}>Cancel</button>
        <button type="button" disabled={busy} className="btn btn-primary" onClick={share}>{busy ? "Sharing…" : "Yes, share"}</button>
      </div>
    </dialog>
  );
}

function DeleteDialog({ dialogRef, conversationId, name }: { dialogRef: React.RefObject<HTMLDialogElement | null>; conversationId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <dialog ref={dialogRef} aria-labelledby="delete-title" className={dialogStyle}>
      <h2 id="delete-title" className="display text-2xl">Delete this conversation?</h2>
      <p className="mt-3 text-dusk">
        It disappears from your messages. {name} keeps their copy and isn’t told. If {name} writes again, the conversation
        comes back with only the new messages.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" className="btn btn-quiet" onClick={() => dialogRef.current?.close()}>Cancel</button>
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteConversation(conversationId);
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Deleting…" : "Delete conversation"}
        </button>
      </div>
    </dialog>
  );
}

function BlockDialog({ dialogRef, profileId, name }: { dialogRef: React.RefObject<HTMLDialogElement | null>; profileId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <dialog ref={dialogRef} aria-labelledby="block-title" className={dialogStyle}>
      <h2 id="block-title" className="display text-2xl">Block {name}?</h2>
      <p className="mt-3 text-dusk">
        You won’t see each other’s profiles, and neither of you will be able to message the other. They won’t be
        told. You can undo this any time under More, Blocked members.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" className="btn btn-quiet" onClick={() => dialogRef.current?.close()}>Cancel</button>
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary"
          onClick={() =>
            startTransition(async () => {
              const result = await blockMember(profileId);
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Blocking…" : `Block ${name}`}
        </button>
      </div>
    </dialog>
  );
}

function ReportDialog({
  dialogRef,
  profileId,
  name,
  conversationId,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  profileId: string;
  name: string;
  conversationId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<{ blocked: boolean }>();

  function submit() {
    if (!reason) return setError("Choose a reason.");
    setError(undefined);
    startTransition(async () => {
      const result = await reportMember({ profileId, reason, details, conversationId, alsoBlock });
      if ("error" in result) return setError(result.error);
      setDone({ blocked: result.blocked });
    });
  }

  function close() {
    dialogRef.current?.close();
    if (done?.blocked) router.push("/discover");
  }

  return (
    <dialog ref={dialogRef} aria-label={`Report ${name}`} className={dialogStyle} onClose={() => done?.blocked && router.push("/discover")}>
      {done ? (
        <>
          <h2 id="report-title" className="display text-2xl">Thanks for letting us know</h2>
          <p className="mt-3 text-dusk">
            Our moderators will review your report{done.blocked ? ` and ${name} has been blocked` : ""}. We won’t tell {name} who reported them.
          </p>
          <div className="mt-5 flex justify-end">
            <button type="button" className="btn btn-primary" onClick={close}>Close</button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <h2 id="report-title" className="display text-2xl">Report {name}</h2>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">What’s the problem?</legend>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="report-details" className="mb-1.5 mt-4 block text-sm font-medium">Details (optional)</label>
          <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} className="field" placeholder="Anything that helps us look into it." />
          {conversationId && (
            <p className="mt-2 text-xs text-dusk">Reporting from a chat shares that conversation with our moderators.</p>
          )}
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
            Also block {name}
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn btn-quiet" onClick={() => dialogRef.current?.close()}>Cancel</button>
            <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Sending…" : "Send report"}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
