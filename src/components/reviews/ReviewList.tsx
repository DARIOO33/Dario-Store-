import Stars from "./Stars";
import { STORE_NAME } from "@/src/lib/store";
import { getT } from "@/src/i18n/server";
import type { ReviewView } from "@/src/services/reviews";

// Every review here comes from a paid order, hence the "Verified purchase" tag.
export default async function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  const t = await getT();

  return (
    <ul className="reviewList">
      {reviews.map((review) => (
        <li key={review.id} className="review">
          <div className="reviewHead">
            <Stars value={review.rating} label={t("reviews.outOfFive", { value: review.rating })} />
            <strong>{review.authorName}</strong>
            {review.mine && <span className="pill">{t("reviews.mine")}</span>}
            <span className="pill pillGreen">{t("reviews.verified")}</span>
            {review.variantName && <span className="muted">{review.variantName}</span>}
            <time className="muted">{review.date}</time>
          </div>

          {review.message && <p className="reviewText">{review.message}</p>}

          {review.reply && (
            <div className="reviewReply">
              <strong>{t("reviews.replyFrom", { name: STORE_NAME })}</strong>
              <p>{review.reply.text}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
