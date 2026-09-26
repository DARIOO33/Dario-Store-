"use client";

import { useState } from "react";
import { submitReviewAction } from "@/src/actions/reviews";
import Stars from "@/src/components/reviews/Stars";
import type { ChatReview } from "@/src/services/messages";
import type { ChatReviewItem } from "@/src/services/reviews";
import { maskName } from "@/src/lib/mask";
import { useT } from "@/src/i18n/client";

const MAX_LENGTH = 1000;

// Shown at the end of a delivered order's chat (customer side): rate each product without
// leaving the conversation. Saving goes through the same review action as the product page.
export default function ChatReviewCard({ review, onSaved }: { review: ChatReview; onSaved: () => void }) {
  const t = useT();

  return (
    <section className="chatReview" aria-label={t("chat.reviewTitle")}>
      <span className="chatReviewKicker">{t("chat.reviewKicker")}</span>
      <h3>{t("chat.reviewTitle")}</h3>
      <p className="muted">{t("chat.reviewIntro")}</p>
      {review.items.map((item) => (
        <ReviewItem key={item.productId} item={item} reviewerName={review.reviewerName} onSaved={onSaved} />
      ))}
    </section>
  );
}

function ReviewItem({ item, reviewerName, onSaved }: { item: ChatReviewItem; reviewerName: string; onSaved: () => void }) {
  const t = useT();
  const [editing, setEditing] = useState(!item.existing);
  const [rating, setRating] = useState(item.existing?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState(item.existing?.message ?? "");
  const [hideName, setHideName] = useState(item.existing?.hideName ?? false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = hovered || rating;

  if (item.existing && !editing) {
    return (
      <div className="chatReviewItem">
        <strong>{item.name}</strong>
        <span className="chatReviewDone">
          <Stars value={item.existing.rating} label={t.plural("reviews.starCount", item.existing.rating)} /> {t("chat.reviewDone")}
          <button type="button" className="linkBtn" onClick={() => setEditing(true)}>
            {t("chat.reviewEdit")}
          </button>
        </span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (rating === 0) {
      setError(t("reviews.ratingRequired"));
      return;
    }

    setBusy(true);
    const result = await submitReviewAction(item.productId, { rating, message, hideName });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    onSaved();
  };

  return (
    <form className="chatReviewItem" onSubmit={handleSubmit}>
      <strong>{item.name}</strong>
      <fieldset className="starPicker" onMouseLeave={() => setHovered(0)}>
        <legend className="visuallyHidden">{t("reviews.yourRating")}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= shown ? "on" : ""} onMouseEnter={() => setHovered(n)}>
            <input type="radio" name={`rating-${item.productId}`} value={n} checked={rating === n} onChange={() => setRating(n)} />
            <span aria-hidden="true">★</span>
            <span className="visuallyHidden">{t.plural("reviews.starCount", n)}</span>
          </label>
        ))}
        <span className="starHint">{shown ? t.messages.reviews.hint[shown as 1 | 2 | 3 | 4 | 5] : t("reviews.required")}</span>
      </fieldset>
      <textarea
        className="input"
        rows={2}
        value={message}
        maxLength={MAX_LENGTH}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("reviews.placeholder")}
        aria-label={`${t("reviews.yourReview")} ${t("reviews.optional")}`}
      />
      <label className="check">
        <input type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} />
        <span>
          {t("reviews.hideName")}
          <span className="hint">
            {" "}
            {t("reviews.appearAs")} <strong>{hideName ? maskName(reviewerName) : reviewerName}</strong>
          </span>
        </span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" className="btn btnAccent" disabled={busy}>
        {busy ? t("reviews.saving") : item.existing ? t("reviews.update") : t("reviews.post")}
      </button>
    </form>
  );
}
