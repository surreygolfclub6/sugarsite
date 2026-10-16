"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SITE_NAME } from "@/lib/config";
import { Suspense, useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

// Reads ?next= on the client, behind its own Suspense, so the form itself is part of the static
// page and is never swapped out (which would wipe anything typed or autofilled early).
function LinkNotice() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return (
    <p role="status" className="mt-4 text-sm text-danger">
      {error === "reset" ? "That reset link has expired or was already used. Ask for a new one." : "That confirmation link didn’t work. Try signing in, or sign up again."}
    </p>
  );
}

function NextField() {
  const next = useSearchParams().get("next");
  return next ? <input type="hidden" name="next" value={next} /> : null;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? signIn : signUp,
    {},
  );
  const isLogin = mode === "login";

  return (
    <div>
      <h1 className="display text-4xl">{isLogin ? "Welcome back" : "Create your profile"}</h1>
      {isLogin && (
        <Suspense fallback={null}>
          <LinkNotice />
        </Suspense>
      )}
      <p className="mt-3 text-dusk">
        {isLogin ? "Sign in to see who’s new." : "Free to join. You’ll verify your age before your profile goes live."}
      </p>

      <form action={action} className="mt-8 space-y-4" noValidate>
        {isLogin && (
          <Suspense fallback={null}>
            <NextField />
          </Suspense>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={isLogin ? undefined : 10}
            className="field"
          />
          {!isLogin && <p className="mt-1.5 text-sm text-dusk">At least 10 characters.</p>}
        </div>

        {!isLogin && (
          <>
            <label className="flex items-start gap-3 text-sm text-dusk">
              <input type="checkbox" name="adult" className="mt-1 size-4 accent-[var(--garnet)]" />
              <span>
                I’m 18 or over and agree to the{" "}
                <Link href="/terms" className="text-pearl underline underline-offset-2">Terms</Link>.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-dusk">
              <input type="checkbox" name="consent" className="mt-1 size-4 accent-[var(--garnet)]" />
              <span>
                I agree that {SITE_NAME} may use the sensitive details I add to my profile, such as who I’m looking
                for, my relationship goals and my ethnicity, to run the service and show them to other members, as
                explained in the{" "}
                <Link href="/privacy" className="text-pearl underline underline-offset-2">Privacy Policy</Link>.
              </span>
            </label>
          </>
        )}

        {isLogin && (
          <p className="text-sm">
            <Link href="/forgot-password" className="text-dusk underline underline-offset-2 hover:text-pearl">Forgot your password?</Link>
          </p>
        )}

        <div aria-live="polite">
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.notice && <p className="text-sm text-brass">{state.notice}</p>}
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-dusk">
        {isLogin ? "New here? " : "Already a member? "}
        <Link href={isLogin ? "/signup" : "/login"} className="text-pearl underline underline-offset-2">
          {isLogin ? "Create a profile" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
