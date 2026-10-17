"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCancelledOrderAction } from "@/src/actions/orders";

// Admin: removes a cancelled order for good, then goes back to the list.
export default function DeleteOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    if (!confirm(`Delete order #${orderNumber} for good? Its items, chat and chat photos are removed too. This can't be undone.`)) return;

    setBusy(true);
    const result = await deleteCancelledOrderAction(orderId);
    if (result.ok) {
      router.push("/admin/orders");
      return;
    }
    setError(result.error);
    setBusy(false);
  };

  return (
    <div style={{ marginTop: "0.6rem" }}>
      <button type="button" className="btn btnSm btnGhost" onClick={remove} disabled={busy}>
        {busy ? "Deleting…" : "Delete order"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
