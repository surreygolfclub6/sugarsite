"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "../actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <div>
      <h1 className="display text-4xl">Reset your password</h1>
      <p className="mt-3 text-dusk">Enter your email and we’ll send you a link to choose a new one.</p>

      <form action={action} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div aria-live="polite">
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.notice && <p className="text-sm text-brass">{state.notice}</p>}
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-dusk">
        <Link href="/login" className="text-pearl underline underline-offset-2">Back to sign in</Link>
      </p>
    </div>
  );
}
