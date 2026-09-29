import { chromium } from "@playwright/test";
import fs from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
const dir = process.env.SCREENSHOT_DIR || "docs/screenshots";
fs.mkdirSync(dir, { recursive: true });
const page = await browser.newPage();
// Drawings load lazily and are revealed as they scroll into view, so walk
// down the page once before a full-page capture.
async function settle() {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2600);
}
for (const lang of ["fr", "en"])
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(`http://127.0.0.1:3002/${lang}`);
    await page.evaluate(() => document.fonts.ready);
    await settle();
    await page.screenshot({
      path: `${dir}/${lang}-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${dir}/${lang}-${width}-hero.png` });
  }
// The mountain ride, held at each act.
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto("http://127.0.0.1:3002/en");
  await page.evaluate(() => document.fonts.ready);
  for (const [i, p] of [0.3, 1.5, 2.6, 3.9].entries()) {
    await page.evaluate((p) => {
      const s = document.getElementById("parcours");
      const top = s.getBoundingClientRect().top + scrollY;
      scrollTo(0, top + (p / 4) * (s.offsetHeight - innerHeight));
    }, p);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/ride-${width}-act${i + 1}.png` });
  }
}
for (const [name, route, width] of [
  ["retirement-desktop", "/fr/planification-retraite", 1440],
  ["guide-desktop", "/en/retirement-guide", 1440],
  ["about-desktop", "/en/about", 1440],
  ["article-desktop", "/fr/revision/cinq-ans-avant-la-retraite", 1440],
  ["fees-mobile", "/en/tools/investment-fees", 390],
  ["meeting-mobile", "/fr/demarche", 390],
]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await page.goto("http://127.0.0.1:3002" + route);
  await settle();
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}
await page.goto("http://127.0.0.1:3002/en/retirement-guide");
await page.locator('[name="question-0"][value="no"]').check();
await page.locator('[name="question-1"][value="unsure"]').check();
await page.emulateMedia({ media: "print" });
await page.screenshot({ path: `${dir}/checklist-print.png`, fullPage: true });
await browser.close();
