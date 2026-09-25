import type { Metadata } from "next";
import LegalPage from "@/src/components/layout/LegalPage";
import { getT } from "@/src/i18n/server";
import { LEGAL } from "@/src/i18n/legal";

export async function generateMetadata(): Promise<Metadata> {
  return { title: LEGAL[(await getT()).locale].privacy.title, alternates: { canonical: "/privacy" } };
}

export default function PrivacyPage() {
  return <LegalPage page="privacy" />;
}
