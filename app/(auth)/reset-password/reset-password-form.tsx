"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "../actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <div>
      <h1 className="display text-4xl">Choose a new password</h1>
      <form action={action} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required className="field" />
          <p className="mt-1.5 text-sm text-dusk">At least 10 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="field" />
        </div>
        <div aria-live="polite">{state.error && <p className="text-sm text-danger">{state.error}</p>}</div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
