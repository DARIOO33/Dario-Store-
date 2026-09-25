import { getT } from "@/src/i18n/server";
import { LEGAL } from "@/src/i18n/legal";
import { SENSITIVE_MESSAGE_DAYS, STORE_NAME, SUPPORT_HOURS } from "@/src/lib/store";
import ContactLinks from "@/src/components/layout/ContactLinks";

const fill = (text: string) =>
  text
    .replace("{store}", STORE_NAME)
    .replace("{from}", String(SUPPORT_HOURS.from))
    .replace("{to}", String(SUPPORT_HOURS.to))
    .replace("{days}", String(SENSITIVE_MESSAGE_DAYS));

export default async function LegalPage({ page }: { page: "terms" | "privacy" }) {
  const t = await getT();
  const content = LEGAL[t.locale][page];

  return (
    <div className="wrap pageTop">
      <header className="pageHead">
        <span className="eyebrow">{STORE_NAME}</span>
        <h1>{content.title}</h1>
        <p className="pageBlurb">{fill(content.intro)}</p>
      </header>

      <article className="legal">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{fill(paragraph)}</p>
            ))}
          </section>
        ))}
        <section>
          <h2>{t("footer.contact")}</h2>
          <ContactLinks className="legalContact" />
        </section>
      </article>
    </div>
  );
}
