import Stars from "./Stars";
import { getT } from "@/src/i18n/server";
import type { ReviewSummary as Summary } from "@/src/services/reviews";

// The big average, and how many reviews gave each number of stars.
export default async function ReviewSummary({ summary }: { summary: Summary }) {
  if (summary.count === 0 || summary.average === null) return null;

  const t = await getT();

  return (
    <div className="reviewSummary">
      <div className="reviewScore">
        <strong>{summary.average.toFixed(1)}</strong>
        <Stars value={summary.average} label={t("reviews.outOfFive", { value: summary.average })} />
        <span className="muted">{t.plural("reviews.count", summary.count)}</span>
      </div>

      <ul className="ratingBars" aria-label={t("reviews.byRating")}>
        {summary.distribution.map(({ stars, count }) => (
          <li key={stars}>
            <span>{stars} ★</span>
            <div className="ratingBar">
              <div style={{ width: `${(count / summary.count) * 100}%` }} />
            </div>
            <span className="muted">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
