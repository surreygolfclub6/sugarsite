"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { blockMember, reportMember } from "@/app/(app)/safety/actions";
import { REPORT_REASONS } from "@/lib/safety";

type Props = { profileId: string; name: string; conversationId?: string };

const dialogStyle =
  "m-auto w-[min(92vw,28rem)] rounded-2xl border border-line bg-velvet p-5 text-pearl backdrop:bg-black/70";

// The "..." menu on a profile or conversation: report or block that member.
export function SafetyMenu({ profileId, name, conversationId }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const blockDialog = useRef<HTMLDialogElement>(null);
  const reportDialog = useRef<HTMLDialogElement>(null);

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
        <ul role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-velvet shadow-lg">
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
      <BlockDialog dialogRef={blockDialog} profileId={profileId} name={name} />
      <ReportDialog dialogRef={reportDialog} profileId={profileId} name={name} conversationId={conversationId} />
    </div>
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
