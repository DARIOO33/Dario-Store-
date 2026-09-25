"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatusAction } from "@/src/actions/orders";
import type { OrderStatus } from "@/src/prisma/orders";

type Props = {
  orderId: string;
  current: OrderStatus;
  options: { value: OrderStatus; label: string }[];
};

export default function OrderStatusForm({ orderId, current, options }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(current);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (current === "CANCELLED") {
    return <p className="muted">Cancelled orders can&apos;t be changed.</p>;
  }

  const save = async () => {
    setSaving(true);
    setError("");
    const result = await setOrderStatusAction(orderId, status);
    if (!result.ok) setError(result.error);
    else router.refresh();
    setSaving(false);
  };

  return (
    <div className="statusForm">
      <div className="catEdit">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} aria-label="Order status">
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btnAccent" onClick={save} disabled={saving || status === current}>
          {saving ? "Saving…" : "Update"}
        </button>
      </div>
      {status === "CANCELLED" && <p className="hint">Cancelling puts the items back in stock and can&apos;t be undone.</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
