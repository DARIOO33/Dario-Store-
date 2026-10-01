"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrackingFromOrderAction } from "@/src/actions/shipments";

// AliExpress picks: one click turns the paid order into a tracking page (items copied) and posts its link in the chat.
export default function CreateTrackingButton({ orderId, ready }: { orderId: string; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <button
        type="button"
        className="btn btnAccent btnSm"
        style={{ marginTop: "0.6rem" }}
        disabled={busy || !ready}
        onClick={async () => {
          setBusy(true);
          setError("");
          const result = await createTrackingFromOrderAction(orderId);
          setBusy(false);
          if (!result.ok) return setError(result.error);
          router.push(`/admin/shipments/${result.id}`);
        }}
      >
        {busy ? "Creating…" : "Create tracking"}
      </button>
      {!ready && <p className="hint">Available once the order is marked as paid.</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
