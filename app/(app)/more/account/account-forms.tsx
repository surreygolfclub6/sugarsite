"use client";

import { useActionState } from "react";
import { changePassword, deleteAccount, type AccountState } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4" aria-label="Change password" noValidate>
      <div>
        <label htmlFor="current" className="mb-1.5 block text-sm font-medium">Current password</label>
        <input id="current" name="current" type="password" autoComplete="current-password" className="field" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="field" />
        <p className="mt-1.5 text-sm text-dusk">At least 10 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="field" />
      </div>
      <div aria-live="polite">
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.notice && <p className="text-sm text-brass">{state.notice}</p>}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="space-y-4" aria-label="Delete account" noValidate>
      <p className="text-sm text-dusk">
        This permanently deletes your profile, photos, messages, likes and blocks. Other members’ conversations with you
        disappear too. It can’t be undone.
      </p>
      <div>
        <label htmlFor="delete-password" className="mb-1.5 block text-sm font-medium">Your password</label>
        <input id="delete-password" name="password" type="password" autoComplete="current-password" className="field" />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="confirm" value="yes" className="mt-1 size-4 accent-[var(--garnet)]" />
        <span>I understand this is permanent.</span>
      </label>
      <div aria-live="polite">{state.error && <p className="text-sm text-danger">{state.error}</p>}</div>
      <button type="submit" disabled={pending} className="btn btn-quiet text-danger">{pending ? "Deleting…" : "Delete my account"}</button>
    </form>
  );
}
