"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";
import { STORE_NAME } from "@/src/lib/store";
import { isTeam, type UserRole } from "@/src/lib/roles";
import { useCart } from "@/src/components/cart/CartProvider";
import LanguageSwitcher from "@/src/components/layout/LanguageSwitcher";
import { useT } from "@/src/i18n/client";

type NavCategory = { slug: string; name: string };

export default function Header({ categories }: { categories: NavCategory[] }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // On phones the category bar scrolls sideways: keep the current one in view.
  useEffect(() => {
    const bar = barRef.current;
    const active = bar?.querySelector<HTMLElement>("a.active");
    if (bar && active) bar.scrollTo({ left: active.offsetLeft - 16, behavior: "smooth" });
  }, [pathname]);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await authClient.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const role = session?.user.role as UserRole | undefined;

  return (
    <header className="header">
      <div className="wrap headerInner">
        <Link href="/" className="brand">
          <span className="brandStar" aria-hidden="true">✱</span>
          {STORE_NAME}
        </Link>

        <form className="searchForm" action="/search" role="search">
          <label htmlFor="site-search" className="visuallyHidden">
            {t("nav.searchLabel")}
          </label>
          <input id="site-search" className="searchInput" name="q" type="search" placeholder={t("nav.searchPlaceholder")} />
        </form>

        <div className="headerActions">
          <LanguageSwitcher />

          <Link href="/cart" className="textBtn" aria-label={t.plural("nav.cartLabel", count)}>
            {t("nav.cart")}
            {count > 0 && <b className="cartCount">{count}</b>}
          </Link>

          {isPending ? (
            <span className="textBtn" aria-hidden="true">&nbsp;</span>
          ) : session ? (
            <div className="menu" ref={menuRef}>
              <button
                type="button"
                className="textBtn accountBtn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {session.user.name.trim().split(" ")[0] || t("nav.account")}
              </button>

              {menuOpen && (
                <div className="menuPanel" role="menu">
                  <div className="menuHead">
                    <strong>{session.user.name}</strong>
                    <span>{session.user.email}</span>
                    <span className={`badge badge${role}`}>{role && t.messages.roles[role]}</span>
                  </div>
                  {isTeam(role) && (
                    <Link href="/admin" className="menuItem" role="menuitem" onClick={() => setMenuOpen(false)}>
                      {t("nav.adminDashboard")}
                    </Link>
                  )}
                  <Link href="/orders" className="menuItem" role="menuitem" onClick={() => setMenuOpen(false)}>
                    {t("nav.myOrders")}
                  </Link>
                  <Link href="/profile" className="menuItem" role="menuitem" onClick={() => setMenuOpen(false)}>
                    {t("nav.profile")}
                  </Link>
                  <button type="button" className="menuItem menuDanger" role="menuitem" onClick={handleSignOut}>
                    {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btnPrimary btnSm" style={{ padding: "0.7rem 1rem" }}>
              {t("nav.logIn")}
            </Link>
          )}
        </div>
      </div>

      <nav className="catBar" aria-label={t("nav.categories")}>
        <div className="wrap catBarInner" ref={barRef}>
          <Link href="/products" className={pathname === "/products" ? "active" : ""} aria-current={pathname === "/products" ? "page" : undefined}>
            {t("nav.all")}
          </Link>
          {categories.map((category) => {
            const active = pathname === `/c/${category.slug}`;
            return (
              <Link key={category.slug} href={`/c/${category.slug}`} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                {category.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
