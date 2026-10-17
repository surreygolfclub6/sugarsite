"use client";

import { useRef, useState } from "react";

// The member's personal invite link, ready to copy or share. The share sheet only appears where the browser has one.
export function CopyLink({ url, shareText }: { url: string; shareText: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      input.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  async function share() {
    try {
      await navigator.share({ title: "SugarMatch", text: shareText, url });
    } catch {
      // The member closed the share sheet.
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          ref={input}
          readOnly
          value={url}
          aria-label="Your invite link"
          onFocus={(e) => e.currentTarget.select()}
          className="field min-w-0 flex-1 truncate !py-2.5 text-sm"
        />
        <button type="button" onClick={copy} className="btn btn-primary !py-2.5 text-sm">
          {copied ? "Copied" : "Copy"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="btn btn-quiet !py-2.5 text-sm">
            Share
          </button>
        )}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-xs text-brass">{copied ? "Link copied. Paste it anywhere." : ""}</p>
    </div>
  );
}
