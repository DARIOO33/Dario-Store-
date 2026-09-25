// Builds ../studio.html: copies studio.src.html and embeds the three fonts and the
// logos as base64, so the finished file works offline with a double-click.
//   node marketing/social-kit/tools/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const brand = join(here, "../../../public/brand");
const b64 = (path) => readFileSync(path).toString("base64");
const svgUri = (name) => `data:image/svg+xml;base64,${b64(join(brand, name))}`;

const face = (family, file, weight) =>
  `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64(join(here, "fonts", file))}) format("woff2");font-weight:${weight};font-style:normal}`;

const fonts = [
  face("Anton", "anton.woff2", "400"),
  face("JetBrains Mono Variable", "jetbrains-mono.woff2", "100 800"),
  face("Instrument Sans Variable", "instrument-sans.woff2", "400 700"),
].join("\n");

const logos = JSON.stringify({
  cream: svgUri("logo-horizontal-on-cream.svg"),
  dark: svgUri("logo-horizontal-on-dark.svg"),
  yellow: svgUri("logo-horizontal-on-yellow.svg"),
  mark: svgUri("logo-mark.svg"),
});

const source = readFileSync(join(here, "studio.src.html"), "utf8");
const out = source.replace("/*@FONTS@*/", () => fonts).replace("/*@LOGOS@*/", () => logos);

writeFileSync(join(here, "../studio.html"), out);
console.log(`studio.html written (${Math.round(out.length / 1024)} KB)`);
