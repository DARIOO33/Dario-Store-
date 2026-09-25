import Link from "next/link";
import Pagination from "@/src/components/ui/Pagination";
import { ReviewService } from "@/src/services/reviews";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import ReviewSummary from "./ReviewSummary";
import { getT } from "@/src/i18n/server";

type Props = {
  productId: string;
  viewer: { id: string; name: string; role: string } | null;
  page: number;
};

// Everything under a product: the rating summary, the form (for people who
// bought it) and the reviews.
export default async function ReviewsSection({ productId, viewer, page }: Props) {
  const t = await getT();
  const [summary, list, access] = await Promise.all([
    ReviewService.summary(productId),
    ReviewService.listForProduct(productId, viewer, page, t.locale),
    ReviewService.accessFor(productId, viewer),
  ]);

  return (
    <section className="section" id="reviews">
      <div className="sectionHead">
        <h2>{t("reviews.title")}</h2>
      </div>

      <ReviewSummary summary={summary} />

      {access.kind === "can-review" ? (
        <ReviewForm productId={productId} fullName={access.fullName} existing={access.existing} />
      ) : (
        <p className="notice reviewNotice">
          {access.kind === "guest" ? (
            <>
              {t("reviews.boughtThis")} <Link href="/login" className="linkBtn">{t("reviews.logIn")}</Link> {t("reviews.toLeaveReview")}
            </>
          ) : (
            t("reviews.notBuyer")
          )}
        </p>
      )}

      {list.total === 0 ? (
        <p className="muted">{access.kind === "can-review" ? t("reviews.noneBeFirst") : t("reviews.none")}</p>
      ) : (
        <>
          <ReviewList reviews={list.reviews} />
          <Pagination page={page} pages={list.pages} href={(p) => `/products/${productId}${p === 1 ? "" : `?rpage=${p}`}#reviews`} />
        </>
      )}
    </section>
  );
}
