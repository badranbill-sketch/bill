import { expect, test } from "@playwright/test";
import { askVideos } from "../../lib/features";
import { pages } from "../../lib/pages";

for (const lang of ["fr", "en"] as const) {
  for (const width of [320, 390, 700, 768, 1440]) {
    test(`${lang} responsive conversion path at ${width}`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/${lang}`);
      await expect(page.locator(".hero .button")).toBeVisible();
      expect(
        await page
          .locator(".hero .button")
          .evaluate((el) => el.getBoundingClientRect().bottom),
      ).toBeLessThan(900);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator(".video-card")).toHaveCount(4);
      await expect(page.locator(".video-card .play")).toHaveCount(0);
      for (const video of askVideos)
        expect(
          pages[lang].retirement.sections.some(
            (section) => section.id === video.anchor[lang],
          ),
        ).toBe(true);
      if (width <= 760) {
        await expect(page.locator("#parcours")).toHaveAttribute(
          "data-mode",
          "live",
        );
        await page.locator("[data-motion-toggle]").click();
        await expect(page.locator("#parcours")).toHaveAttribute(
          "data-mode",
          "static",
        );
        await expect(page.locator(".ride-panel").first()).toBeVisible();
        await page.locator("[data-motion-toggle]").click();
        await expect(page.locator("#parcours")).toHaveAttribute(
          "data-mode",
          "live",
        );
        await page.locator(".ask-dots button").nth(2).click();
        await expect(page.locator(".ask-dots button").nth(2)).toHaveAttribute(
          "aria-current",
          "true",
        );
        await page.locator(".ask-dots button").nth(3).click();
        await expect(page.locator(".ask-dots button").nth(3)).toHaveAttribute(
          "aria-current",
          "true",
        );
        await page.locator(".menu-button").click();
        await expect(page.locator("#mobile-menu")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.locator(".menu-button")).toBeFocused();
      }
      await page.locator(".guide-contents summary").click();
      await expect(page.locator(".guide-contents li")).toHaveCount(4);
      await expect(page.locator(".guide-actions .button")).toHaveAttribute(
        "href",
        "/api/guide",
      );
      const pdf = await request.get("/api/guide");
      expect(pdf.status()).toBe(200);
      expect(pdf.headers()["content-type"]).toBe("application/pdf");
      expect(pdf.headers()["cache-control"]).toContain("no-store");
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `test-results/combined-${lang}-${width}.png`,
          fullPage: true,
        });
      await page.locator(".talk .button").click();
      await expect(page).toHaveURL(
        new RegExp(lang === "fr" ? "/fr/demarche" : "/en/how-it-works"),
      );
      await expect(
        page.locator('a[href="https://calendly.com/bbadran"]'),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

test("review PDF is unavailable outside review mode", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3101/api/guide", {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from("review-test:test-only-password").toString("base64"),
    },
  });
  expect(response.status()).toBe(404);
});
