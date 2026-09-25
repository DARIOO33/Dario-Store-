"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelMyOrderAction } from "@/src/actions/orders";
import { useT } from "@/src/i18n/client";

export default function CancelOrderButton({ orderId, token }: { orderId: string; token: string | null }) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleCancel = async () => {
    if (!confirm(t("order.cancelConfirm"))) return;

    setPending(true);
    setError("");
    try {
      const result = await cancelMyOrderAction(orderId, token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError(t("order.cancelFailed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <button type="button" className="btn btnGhost" onClick={handleCancel} disabled={pending}>
        {pending ? t("order.cancelling") : t("order.cancel")}
      </button>
      {error && <p className="error" style={{ marginTop: "0.6rem" }}>{error}</p>}
    </div>
  );
}
