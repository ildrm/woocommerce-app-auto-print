import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUTOPRINT_CHROME ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
await page.addInitScript(() => {
  localStorage.setItem("theme", "light");
  localStorage.setItem("locale", "en");
});
await page.goto("http://127.0.0.1:5173");
await page
  .locator(".agent-indicator")
  .filter({ hasText: "Agent online" })
  .waitFor();
await page.evaluate(() => document.fonts.ready);
await mkdir("docs", { recursive: true });
await page.screenshot({ path: "docs/DASHBOARD_VERIFIED.png", fullPage: true });
console.log(
  JSON.stringify({
    title: await page.title(),
    viewport: page.viewportSize(),
    pageWidth: await page.evaluate(() => document.documentElement.scrollWidth),
  }),
);
await browser.close();
