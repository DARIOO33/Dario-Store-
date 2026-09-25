"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReviewAction, submitReviewAction } from "@/src/actions/reviews";
import { maskName } from "@/src/lib/mask";
import { useT } from "@/src/i18n/client";

type Props = {
  productId: string;
  // The customer's account name, used only to preview the masked version.
  fullName: string;
  existing: { id: string; rating: number; message: string; hideName: boolean } | null;
};

const MAX_LENGTH = 1000;

// Rate 1-5 stars (required), an optional message, and the option to hide the
// name. If the customer already reviewed this product, the same form edits it.
export default function ReviewForm({ productId, fullName, existing }: Props) {
  const t = useT();
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState(existing?.message ?? "");
  const [hideName, setHideName] = useState(existing?.hideName ?? false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const shown = hovered || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (rating === 0) {
      setError(t("reviews.ratingRequired"));
      return;
    }

    setBusy(true);
    const result = await submitReviewAction(productId, { rating, message, hideName });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!existing || !confirm(t("reviews.deleteConfirm"))) return;

    setBusy(true);
    const result = await deleteReviewAction(existing.id);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRating(0);
    setMessage("");
    setHideName(false);
    router.refresh();
  };

  return (
    <form className="reviewForm" id="write-review" onSubmit={handleSubmit}>
      <h3>{existing ? t("reviews.formTitleEdit") : t("reviews.formTitleNew")}</h3>

      <fieldset className="starPicker" onMouseLeave={() => setHovered(0)}>
        <legend className="visuallyHidden">{t("reviews.yourRating")}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= shown ? "on" : ""} onMouseEnter={() => setHovered(n)}>
            <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
            <span aria-hidden="true">★</span>
            <span className="visuallyHidden">
              {t.plural("reviews.starCount", n)}
            </span>
          </label>
        ))}
        <span className="starHint">{shown ? t.messages.reviews.hint[shown as 1 | 2 | 3 | 4 | 5] : t("reviews.required")}</span>
      </fieldset>

      <div className="field">
        <label htmlFor="review-message">
          {t("reviews.yourReview")} <span className="muted">{t("reviews.optional")}</span>
        </label>
        <textarea
          id="review-message"
          className="input"
          value={message}
          maxLength={MAX_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("reviews.placeholder")}
        />
      </div>

      <label className="check">
        <input type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} />
        <span>
          {t("reviews.hideName")}
          <span className="hint">
            {" "}
            {t("reviews.appearAs")} <strong>{hideName ? maskName(fullName) : fullName}</strong>
          </span>
        </span>
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="okNote">{t("reviews.saved")}</p>}

      <div className="formActions">
        <button type="submit" className="btn btnAccent" disabled={busy}>
          {busy ? t("reviews.saving") : existing ? t("reviews.update") : t("reviews.post")}
        </button>
        {existing && (
          <button type="button" className="btn btnGhost" onClick={handleDelete} disabled={busy}>
            {t("reviews.delete")}
          </button>
        )}
      </div>
    </form>
  );
}
