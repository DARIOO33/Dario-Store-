import type { Metadata } from "next";
import LegalPage from "@/src/components/layout/LegalPage";
import { getT } from "@/src/i18n/server";
import { LEGAL } from "@/src/i18n/legal";

export async function generateMetadata(): Promise<Metadata> {
  return { title: LEGAL[(await getT()).locale].terms.title };
}

export default function TermsPage() {
  return <LegalPage page="terms" />;
}
