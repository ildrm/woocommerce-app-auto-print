// Coverage is intentionally reported; untranslated messages must not be mistaken for reviewed locales.
import { readFileSync } from "node:fs";
const text = readFileSync("apps/desktop/src/i18n.ts", "utf8");
for (const locale of [
  "en",
  "fa",
  "ar",
  "zh-CN",
  "hi",
  "ru",
  "tr",
  "fr",
  "de",
  "es",
  "pt",
  "ja",
  "ko",
]) {
  if (!text.includes(`${locale}:`) && !text.includes(`'${locale}':`) && !text.includes(`"${locale}":`))
    throw new Error(`Locale missing: ${locale}`);
}
console.log(
  "13 locale resources declared. Complete translation and human review remain release gates.",
);
