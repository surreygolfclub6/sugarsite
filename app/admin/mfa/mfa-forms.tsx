"use client";

import { useActionState, useState } from "react";
import { startEnrollment, verifyCode, type MfaState } from "./actions";

export function CodeForm({ factorId, label = "Verify" }: { factorId: string; label?: string }) {
  const [state, action, pending] = useActionState<MfaState, FormData>(verifyCode, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="factorId" value={factorId} />
      <div>
        <label htmlFor="code" className="mb-1.5 block text-sm font-medium">6-digit code</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          autoFocus
          placeholder="123 456"
          className="field text-center text-xl tracking-[0.3em]"
        />
      </div>
      <div aria-live="polite">{state.error && <p className="text-sm text-danger">{state.error}</p>}</div>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">{pending ? "Checking…" : label}</button>
    </form>
  );
}

export function EnrollPanel({ buttonLabel = "Set up authenticator app" }: { buttonLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [enrollment, setEnrollment] = useState<{ factorId: string; qr: string; secret: string }>();

  async function begin() {
    setBusy(true);
    setError(undefined);
    const result = await startEnrollment();
    setBusy(false);
    if ("error" in result) setError(result.error);
    else setEnrollment(result);
  }

  if (!enrollment) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={begin} disabled={busy} className="btn btn-primary w-full">{busy ? "Starting…" : buttonLabel}</button>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-dusk">
        <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).</li>
        <li>Scan this code, or type the key in by hand.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <div className="flex justify-center rounded-2xl border border-line bg-white p-3">
        {/* A data: SVG generated for this one set-up. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qr} alt="Authenticator set-up code" width={200} height={200} />
      </div>
      <div className="text-center">
        <p className="text-xs text-dusk">Can’t scan it? Enter this key:</p>
        <p data-secret className="mt-1 break-all font-mono text-sm tracking-wider">{enrollment.secret}</p>
      </div>
      <CodeForm factorId={enrollment.factorId} label="Turn on two-step sign-in" />
    </div>
  );
}
