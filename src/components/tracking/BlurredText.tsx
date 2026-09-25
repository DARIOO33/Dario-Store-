import { getT } from "@/src/i18n/server";

// Shows a masked value (from lib/mask.ts, where `*` is a hidden character) with
// the hidden parts smudged out. The real characters never reach the browser:
// this only styles what the server already masked.
export default async function BlurredText({ value }: { value: string }) {
  const t = await getT();

  return (
    <span className="blurText" title={t("tracking.hiddenTitle")}>
      {value.split(/(\*+)/).map((part, i) =>
        part.startsWith("*") ? (
          <span key={i} className="blurMask" aria-hidden="true">
            {"•".repeat(part.length)}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}
