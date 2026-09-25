"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReviewAction, replyToReviewAction, setReviewHiddenAction } from "@/src/actions/reviews";

type Props = { reviewId: string; hidden: boolean; reply: string };

// Hide/show a review, answer it publicly as the store, or delete it.
export default function ReviewModeration({ reviewId, hidden, reply }: Props) {
  const router = useRouter();
  const [text, setText] = useState(reply);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError("");
    const result = await work();
    if (!result.ok) setError(result.error ?? "");
    else router.refresh();
    setBusy(false);
  };

  return (
    <div className="reviewModeration">
      <div className="replyRow">
        <input
          className="input"
          value={text}
          maxLength={600}
          onChange={(e) => setText(e.target.value)}
          placeholder="Public reply from the store (optional)"
          aria-label="Reply to this review"
        />
        <button type="button" className="btn btnSm btnAccent" disabled={busy || text.trim() === reply} onClick={() => run(() => replyToReviewAction(reviewId, text))}>
          {reply ? "Update reply" : "Reply"}
        </button>
      </div>

      <div className="rowActions">
        <button type="button" className="btn btnSm" disabled={busy} onClick={() => run(() => setReviewHiddenAction(reviewId, !hidden))}>
          {hidden ? "Show in shop" : "Hide from shop"}
        </button>
        <button
          type="button"
          className="btn btnSm btnGhost"
          disabled={busy}
          onClick={() => {
            if (confirm("Delete this review for good?")) run(() => deleteReviewAction(reviewId));
          }}
        >
          Delete
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
