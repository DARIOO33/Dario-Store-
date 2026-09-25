"use client";

import { useState } from "react";
import { useT } from "@/src/i18n/client";

export default function CopyValue({ value }: { value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the value is still selectable on screen.
    }
  };

  return (
    <button type="button" className="copyBtn" onClick={copy} aria-label={t("ui.copyValue", { value })}>
      {copied ? t("ui.copied") : t("ui.copy")}
    </button>
  );
}
