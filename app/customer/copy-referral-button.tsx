"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyReferralButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      title="Copy referral code"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d8d8d2] bg-white px-3 text-xs font-semibold text-black transition-colors hover:border-black"
    >
      {copied ? <Check aria-hidden="true" className="size-4 text-[#008d44]" /> : <Copy aria-hidden="true" className="size-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
