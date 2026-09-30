/**
 * BASE02 capture (F03): both language routes of the home page (which carries the journey, #parcours), the guide
 * page (route key `resources`) and the contact path (route key `meeting`, whose #contact section holds the inquiry
 * form), at 320, 390, 768 and 1440 px. Paths come from lib/routes.ts (pathFor). Every capture records the HTTP
 * status, console errors, uncaught page errors, failed requests, 4xx/5xx subresources and horizontal overflow, and
 * saves a full-page PNG. The other route keys get a status/console smoke check at 320 and 1440 (no screenshot).
 *
 * A capture fails only on facts that are regressions by themselves: a non-200 document, an uncaught page error, or
 * a missing journey / inquiry section. Console errors and overflow are recorded and compared before/after by
 * tests/baseline/compare-screens.mjs, not asserted here, so a pre-existing condition is reported, not hidden.
 *
 * Run: npm run build && npm run test:base02  (see tests/baseline/README.md).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { pathFor, routes, type PageKey } from "../../lib/routes";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const OUT = process.env.BASE02_OUT
  ? path.resolve(process.env.BASE02_OUT)
  : path.join(root, "test-results", "baseline", "base02");
const APP_DIR = process.env.BASE02_APP_DIR
  ? path.resolve(process.env.BASE02_APP_DIR)
  : root;
const RECORDS = path.join(OUT, "records");
fs.mkdirSync(RECORDS, { recursive: true });

const LANGS = ["fr", "en"] as const;
const WIDTHS = [320, 390, 768, 1440];
const SHOTS: { key: PageKey; label: string }[] = [
  { key: "home", label: "home (journey #parcours)" },
  { key: "resources", label: "guide" },
  { key: "meeting", label: "contact (inquiry #contact)" },
];
const SMOKE_KEYS = (Object.keys(routes) as PageKey[]).filter(
  (k) => !SHOTS.some((s) => s.key === k),
);
const SMOKE_WIDTHS = [320, 1440];

type Observed = {
  console_errors: string[];
  page_errors: string[];
  failed_requests: string[];
  bad_responses: string[];
  aborted_requests: number;
};

/** Collects browser facts. Lists are sorted when read so before/after compare order-insensitively. */
function observe(page: Page): () => Observed {
  const o: Observed = {
    console_errors: [],
    page_errors: [],
    failed_requests: [],
    bad_responses: [],
    aborted_requests: 0,
  };
  page.on("console", (m) => {
    if (m.type() === "error") o.console_errors.push(m.text());
  });
  page.on("pageerror", (e) => o.page_errors.push(e.message));
  page.on("requestfailed", (r) => {
    const err = r.failure()?.errorText ?? "";
    // net::ERR_ABORTED is a request the page itself cancelled (Next.js link prefetches); counted, not listed.
    if (err === "net::ERR_ABORTED") o.aborted_requests++;
    else
      o.failed_requests.push(
        `${r.method()} ${new URL(r.url()).pathname} ${err}`.trim(),
      );
  });
  page.on("response", (r) => {
    if (r.status() >= 400)
      o.bad_responses.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  return () => ({
    console_errors: [...o.console_errors].sort(),
    page_errors: [...o.page_errors].sort(),
    failed_requests: [...o.failed_requests].sort(),
    bad_responses: [...o.bad_responses].sort(),
    aborted_requests: o.aborted_requests,
  });
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // Scroll the whole page once so lazy images load, then return to the top.
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  // Wait (bounded) for images that started loading. A lazy image that never enters the layout (for example inside
  // a container hidden at this width) never completes; it is recorded, not waited on forever.
  return page.evaluate(async () => {
    const pending = Array.from(document.images).filter((img) => !img.complete);
    await Promise.race([
      Promise.all(
        pending.map(
          (img) =>
            new Promise((r) => {
              img.addEventListener("load", r, { once: true });
              img.addEventListener("error", r, { once: true });
            }),
        ),
      ),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
    return Array.from(document.images)
      .filter((img) => !img.complete)
      .map((img) => new URL(img.currentSrc || img.src, location.href).pathname);
  });
}

async function layout(page: Page) {
  return page.evaluate(() => ({
    horizontal_overflow:
      document.documentElement.scrollWidth > window.innerWidth,
    scroll_width: document.documentElement.scrollWidth,
    page_height: document.documentElement.scrollHeight,
    journey:
      document.querySelector("#parcours")?.getAttribute("data-mode") ??
      (document.querySelector("#parcours") ? "present" : null),
    inquiry_form: !!document.querySelector("#contact form.inquiry"),
    contact_section: !!document.querySelector("#contact"),
  }));
}

function write(id: string, record: object) {
  fs.writeFileSync(
    path.join(RECORDS, `${id}.json`),
    JSON.stringify(record, null, 2) + "\n",
  );
}

for (const lang of LANGS) {
  for (const { key, label } of SHOTS) {
    for (const width of WIDTHS) {
      const id = `${lang}-${key}-${width}`;
      const url = pathFor(lang, key);
      test(`capture ${id} ${url}`, async ({ page, browser }) => {
        await page.setViewportSize({ width, height: 900 });
        const observed = observe(page);
        const response = await page.goto(url, { waitUntil: "networkidle" });
        const imagesIncomplete = await settle(page);
        const l = await layout(page);
        const file = `${id}.png`;
        const png = await page.screenshot({
          path: path.join(OUT, file),
          fullPage: true,
          animations: "disabled",
          caret: "hide",
        });
        const o = observed();
        write(id, {
          id,
          kind: "screenshot",
          lang,
          key,
          label,
          width,
          url,
          final_url: new URL(page.url()).pathname,
          http_status: response?.status() ?? null,
          ...o,
          ...l,
          images_incomplete: imagesIncomplete,
          screenshot: file,
          screenshot_sha256: crypto
            .createHash("sha256")
            .update(png)
            .digest("hex"),
          browser: `chromium ${browser.version()}`,
          app_dir: APP_DIR,
          reduced_motion: true,
          captured_at: new Date().toISOString(),
        });
        expect(response?.status(), `${url} document status`).toBe(200);
        expect(o.page_errors, `${url} uncaught page errors`).toEqual([]);
        if (key === "home")
          expect(l.journey, "journey #parcours").not.toBeNull();
        if (key === "meeting")
          expect(l.contact_section, "contact section #contact").toBe(true);
      });
    }
  }
  for (const key of SMOKE_KEYS) {
    for (const width of SMOKE_WIDTHS) {
      const id = `smoke-${lang}-${key}-${width}`;
      const url = pathFor(lang, key);
      test(`smoke ${id} ${url}`, async ({ page, browser }) => {
        await page.setViewportSize({ width, height: 900 });
        const observed = observe(page);
        const response = await page.goto(url, { waitUntil: "networkidle" });
        const l = await layout(page);
        const o = observed();
        write(id, {
          id,
          kind: "smoke",
          lang,
          key,
          width,
          url,
          final_url: new URL(page.url()).pathname,
          http_status: response?.status() ?? null,
          ...o,
          horizontal_overflow: l.horizontal_overflow,
          scroll_width: l.scroll_width,
          browser: `chromium ${browser.version()}`,
          app_dir: APP_DIR,
          captured_at: new Date().toISOString(),
        });
        expect(response?.status(), `${url} document status`).toBe(200);
        expect(o.page_errors, `${url} uncaught page errors`).toEqual([]);
      });
    }
  }
}

test("endpoints: / entry and /api/guide review PDF", async ({ request }) => {
  const entry = await request.get("/", { maxRedirects: 0 });
  const guide = await request.get("/api/guide", { maxRedirects: 0 });
  write("endpoints", {
    id: "endpoints",
    kind: "endpoints",
    entry: {
      status: entry.status(),
      location: entry.headers()["location"] ?? null,
    },
    api_guide: {
      status: guide.status(),
      content_type: guide.headers()["content-type"] ?? null,
      bytes: (await guide.body()).length,
    },
    app_dir: APP_DIR,
    captured_at: new Date().toISOString(),
  });
  expect(entry.status()).toBeLessThan(500);
  expect(guide.status()).toBeLessThan(500);
});
