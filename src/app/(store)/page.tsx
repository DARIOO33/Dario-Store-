import Link from "next/link";
import { CatalogService } from "@/src/services/catalog";
import { CategoryService } from "@/src/services/categories";
import ProductCard from "@/src/components/catalog/ProductCard";
import CategoryTile from "@/src/components/catalog/CategoryTile";
import ProductMedia from "@/src/components/catalog/ProductMedia";
import ProductArt from "@/src/components/catalog/ProductArt";
import Price from "@/src/components/ui/Price";
import { formatAmount } from "@/src/lib/money";
import { availableMethodsText } from "@/src/lib/payments";
import { getLocale, getT } from "@/src/i18n/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getT();
  const [featured, latest, categories] = await Promise.all([
    CatalogService.featured(4, locale),
    CatalogService.latest(8, locale),
    CategoryService.listWithCounts(locale),
  ]);

  // The pinned categories are the shop's shelves; if none are pinned yet,
  // fall back to every category.
  const pinned = categories.filter((category) => category.inNav);
  const shelves = pinned.length > 0 ? pinned : categories;
  const shelfProducts = await Promise.all(shelves.map((category) => CatalogService.byCategory(category.id, 4, locale)));

  // Featured first, topped up with the latest; a featured product is often also
  // among the latest, so drop repeats.
  const heroPool = featured.length >= 3 ? featured : [...featured, ...latest];
  const heroProducts = heroPool.filter((product, i) => heroPool.findIndex((other) => other.id === product.id) === i).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="wrap heroGrid">
          <div className="heroText">
            <span className="kicker">{t("home.kicker")}</span>
            <h1>
              <span className="hLine">{t("home.line1")}</span>
              <span className="hLine hAccent">{t("home.line2")}</span>
            </h1>
            <p>{t("home.intro", { methods: availableMethodsText(t) })}</p>
            <div className="heroActions">
              <Link href="/products" className="btn btnPrimary btnLg">
                {t("home.browse")}
              </Link>
              <Link href="/products?type=VIRTUAL" className="btn btnLg">
                {t("home.digitalOnly")}
              </Link>
            </div>
          </div>

          <div className="heroDeck" aria-label={t("home.featuredLabel")}>
            {(heroProducts.length ? heroProducts : [null, null, null]).map((product, i) =>
              product ? (
                <Link key={product.id} href={`/products/${product.slug}`} className={`deckCard deckCard${i}`} data-tilt>
                  <span className="deckArt">
                    <ProductMedia imageUrl={product.imageUrl} seed={product.id} label={product.name} alt="" />
                  </span>
                  <span className="deckTag">
                    <b>{product.name}</b>
                    <Price millimes={product.priceMillimes} />
                  </span>
                </Link>
              ) : (
                <div key={i} className={`deckCard deckCard${i}`}>
                  <span className="deckArt">
                    <ProductArt seed={`dario-${i}`} label="Dario Store" />
                  </span>
                </div>
              ),
            )}
            {heroProducts.length > 0 && (
              <div className="sticker" aria-hidden="true">
                <small>{t("home.from")}</small>
                <b>{formatAmount(Math.min(...heroProducts.map((product) => product.priceMillimes))).replace(",000", "")}</b>
                <small>DT</small>
              </div>
            )}
          </div>
        </div>
      </section>

      {shelves.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="sectionHead">
              <h2>{t("home.shopByCategory")}</h2>
              <Link href="/categories" className="sectionLink">
                {t("home.allCategories")}
              </Link>
            </div>
            <div className="tiles">
              {shelves.map((category, i) => (
                <CategoryTile
                  key={category.id}
                  href={`/c/${category.slug}`}
                  name={category.name}
                  count={String(category.productCount).padStart(2, "0")}
                  meta={category.blurb || undefined}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="sectionHead">
              <h2>{t("home.featuredPicks")}</h2>
              <Link href="/products" className="sectionLink">
                {t("home.seeAll")}
              </Link>
            </div>
            <div className="productGrid">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {shelves.map((category, i) =>
        shelfProducts[i]!.length > 0 ? (
          <section key={category.id} className="section">
            <div className="wrap">
              <div className="sectionHead">
                <h2>{category.name}</h2>
                <Link href={`/c/${category.slug}`} className="sectionLink">
                  {t("home.seeAllCount", { count: category.productCount })}
                </Link>
              </div>
              <div className="productGrid">
                {shelfProducts[i]!.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        ) : null,
      )}

      <section className="section">
        <div className="wrap">
          <div className="aliBand">
            <div>
              <h2>{t("home.aliTitle")}</h2>
              <p>{t("home.aliText")}</p>
            </div>
            <Link href="/track" className="btn btnPrimary btnLg">
              {t("home.aliButton")}
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="steps">
            <div className="step">
              <span className="stepNo">1</span>
              <h3>{t("home.step1Title")}</h3>
              <p>{t("home.step1Text")}</p>
            </div>
            <div className="step">
              <span className="stepNo">2</span>
              <h3>{t("home.step2Title")}</h3>
              <p>{t("home.step2Text")}</p>
            </div>
            <div className="step">
              <span className="stepNo">3</span>
              <h3>{t("home.step3Title")}</h3>
              <p>{t("home.step3Text")}</p>
            </div>
          </div>
        </div>
      </section>

      {featured.length === 0 && latest.length === 0 && (
        <section className="section">
          <div className="wrap">
            <p className="muted">{t("home.empty")}</p>
          </div>
        </section>
      )}
    </>
  );
}
