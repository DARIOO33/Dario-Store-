import Link from "next/link";
import { getT } from "@/src/i18n/server";

// `href` builds the link for a given page, so each page keeps its own filters.
export default async function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;

  const t = await getT();

  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );

  return (
    <nav className="pagination" aria-label={t("ui.pages")}>
      {page > 1 && (
        <Link href={href(page - 1)} className="pageLink" aria-label={t("ui.previousPage")}>
          ←
        </Link>
      )}
      {numbers.map((n, i) => (
        <span key={n} style={{ display: "contents" }}>
          {i > 0 && n - numbers[i - 1]! > 1 && <span className="pageGap">…</span>}
          <Link href={href(n)} className={`pageLink${n === page ? " current" : ""}`} aria-current={n === page ? "page" : undefined}>
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className="pageLink" aria-label={t("ui.nextPage")}>
          →
        </Link>
      )}
    </nav>
  );
}
