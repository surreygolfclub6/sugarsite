"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useEffect, useRef, useState } from "react";

// The public site key. Leave NEXT_PUBLIC_HCAPTCHA_SITEKEY unset where Supabase's CAPTCHA protection is off
// (local development) and the widget simply doesn't render.
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY;

// Renders the hCaptcha check and a hidden `captcha_token` field for the server action to pass to Supabase.
// A token works once, so the widget resets whenever `resetKey` changes (pass the action's state).
export function Captcha({ onReadyChange, resetKey }: { onReadyChange?: (ready: boolean) => void; resetKey?: unknown }) {
  const widget = useRef<HCaptcha>(null);
  const [token, setToken] = useState("");
  const first = useRef(true);

  useEffect(() => {
    onReadyChange?.(!!token);
  }, [token, onReadyChange]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    widget.current?.resetCaptcha();
    setToken("");
  }, [resetKey]);

  if (!CAPTCHA_SITE_KEY) return null;
  return (
    <div>
      <HCaptcha
        ref={widget}
        sitekey={CAPTCHA_SITE_KEY}
        theme="dark"
        onVerify={setToken}
        onExpire={() => setToken("")}
        onError={() => setToken("")}
      />
      <input type="hidden" name="captcha_token" value={token} />
    </div>
  );
}
