"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAfterLogin, readAfterLogin } from "@/src/lib/after-login";
import { useT } from "@/src/i18n/client";

const REDIRECT_MS = 2500;

function SuccessContent() {
  const t = useT();
  const router = useRouter();
  const isRegister = useSearchParams().get("type") === "register";

  useEffect(() => {
    const destination = readAfterLogin();
    const timer = setTimeout(() => {
      clearAfterLogin();
      router.replace(destination);
      router.refresh();
    }, REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="card center">
      <div className="checkCircle" aria-hidden="true">
        ✓
      </div>
      <h1 className="cardTitle">
        {isRegister ? t("auth.successRegister") : t("auth.successLogin")}
      </h1>
      <p className="cardText">
        {isRegister ? t("auth.accountCreated") : t("auth.welcome")} {t("auth.takingBack")}
      </p>
      <div className="progress">
        <div className="progressBar" style={{ animationDuration: `${REDIRECT_MS}ms` }} />
      </div>
      <p className="cardFooter">
        <Link href="/">{t("auth.goNow")}</Link>
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="authPage">
      <Suspense>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
