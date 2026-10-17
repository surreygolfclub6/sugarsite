"use client";

import { useActionState, useState } from "react";
import { Captcha, CAPTCHA_SITE_KEY } from "@/components/captcha";
import { resendConfirmation, type AuthState } from "../actions";

export function ResendForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(resendConfirmation, {});
  const [captchaReady, setCaptchaReady] = useState(!CAPTCHA_SITE_KEY);
  return (
    <form action={action} className="space-y-4">
      <div className="flex justify-center">
        <Captcha onReadyChange={setCaptchaReady} resetKey={state} />
      </div>
      <div aria-live="polite">
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.notice && <p className="text-sm text-brass">{state.notice}</p>}
      </div>
      <button type="submit" disabled={pending || !captchaReady} className="btn btn-quiet">
        {pending ? "Sending…" : "Resend the email"}
      </button>
    </form>
  );
}
