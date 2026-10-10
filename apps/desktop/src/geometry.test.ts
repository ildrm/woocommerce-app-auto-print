import { describe, it, expect } from "vitest";
import { physicalUm, csvCell } from "./geometry";
import { translate, translationCoverage } from "./i18n";
describe("physical paper inputs", () => {
  it("keeps imperial and metric conversions equivalent", () => {
    expect(physicalUm("4", "in")).toBe(101600);
    expect(physicalUm("10.16", "cm")).toBe(101600);
    expect(physicalUm("101.6", "mm")).toBe(101600);
    expect(physicalUm("0.0005", "mm")).toBe(1);
  });
  it("rejects ambiguous numeric input", () => {
    expect(() => physicalUm("1e3", "mm")).toThrow();
    expect(() => physicalUm("NaN", "mm")).toThrow();
  });
});
describe("privacy and localization", () => {
  it("neutralizes spreadsheet formulas in exports", () => {
    expect(csvCell('=HYPERLINK("https://example.com")')).toMatch(/^"'/);
    expect(csvCell("normal, text")).toBe('"normal, text"');
  });
  it("provides an honest fallback with RTL messages", () => {
    expect(translate("fa", "queue")).toBe("صف چاپ");
    expect(translate("ja", "outcomeWarning")).toBe(
      translate("en", "outcomeWarning"),
    );
    expect(translationCoverage("ja").humanReviewed).toBe(false);
  });
});
