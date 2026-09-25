"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markRefundedAction } from "@/src/actions/orders";

// Admin: after sending the money back for a cancelled order.
export default function MarkRefundedButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const markRefunded = async () => {
    if (!confirm("Mark this payment as refunded? Do it only after you have sent the money back.")) return;

    setBusy(true);
    const result = await markRefundedAction(orderId);
    if (result.ok) router.refresh();
    else setError(result.error);
    setBusy(false);
  };

  return (
    <div>
      <button type="button" className="btn btnSm" onClick={markRefunded} disabled={busy}>
        {busy ? "Saving…" : "Mark refunded"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
