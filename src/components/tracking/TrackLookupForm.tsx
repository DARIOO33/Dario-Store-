"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeTrackingCode } from "@/src/lib/shipments";
import { useT } from "@/src/i18n/client";

// For customers who have the code but not the link.
export default function TrackLookupForm() {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeTrackingCode(code);

    if (!normalized) {
      setError(t("tracking.invalidCode"));
      return;
    }
    router.push(`/track/${normalized}`);
  };

  return (
    <form className="trackLookup" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="track-code">{t("tracking.codeLabel")}</label>
        <input id="track-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("tracking.codePlaceholder")} autoComplete="off" autoCapitalize="characters" required />
      </div>
      <button type="submit" className="btn btnAccent btnLg">
        {t("tracking.trackIt")}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
