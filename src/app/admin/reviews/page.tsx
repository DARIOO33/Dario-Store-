import type { Metadata } from "next";
import Link from "next/link";
import { ReviewService } from "@/src/services/reviews";
import ReviewModeration from "@/src/components/admin/ReviewModeration";
import Pagination from "@/src/components/ui/Pagination";
import Stars from "@/src/components/reviews/Stars";
import { buildQuery } from "@/src/lib/query";
import { getT } from "@/src/i18n/server";

export const metadata: Metadata = { title: "Reviews" };

const PAGE_SIZE = 12;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = await ReviewService.listForAdmin(page, PAGE_SIZE);

  return (
    <>
      <header className="adminHead">
        <div>
          <span className="eyebrow">Customers</span>
          <h1>Reviews</h1>
        </div>
      </header>

      <p className="muted">
        {total} review{total === 1 ? "" : "s"}. Hidden reviews disappear from the shop and from the average.
      </p>

      {rows.length === 0 ? (
        <div className="panel">
          <p className="muted">No reviews yet — customers can review a product once their order is paid.</p>
        </div>
      ) : (
        <ul className="adminReviews">
          {rows.map((review) => (
            <li key={review.id} className={`panel${review.hidden ? " isHidden" : ""}`}>
              <div className="reviewHead">
                <Stars value={review.rating} label={t("reviews.outOfFive", { value: review.rating })} />
                <strong>{review.authorName}</strong>
                {review.hidden && <span className="pill pillRed">Hidden</span>}
                <Link href={`/products/${review.productId}#reviews`} className="linkBtn">
                  {review.productName}
                </Link>
                {review.variantName && <span className="muted">{review.variantName}</span>}
                <time className="muted">{review.date}</time>
              </div>
              {review.message && <p className="reviewText">{review.message}</p>}
              <ReviewModeration reviewId={review.id} hidden={review.hidden} reply={review.reply?.text ?? ""} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pages={pages} href={(p) => `/admin/reviews${buildQuery({ page: p > 1 ? p : undefined })}`} />
    </>
  );
}
