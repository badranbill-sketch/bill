import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { routes, pathFor, type PageKey } from "../../lib/routes";
import fs from "node:fs";
const screenshotDir = process.env.SCREENSHOT_DIR || "test-results/screenshots";
for (const lang of ["fr", "en"] as const) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ])
    test(`${lang} visual ${viewport.width}, landmarks and accessibility`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/" + lang);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", `${lang}-CA`);
      await expect(page.locator(".hero-person img")).toBeVisible();
      expect(
        await page
          .locator(".hero-person img")
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      ).toBeGreaterThan(0);
      expect(
        await page
          .locator(".hero .button")
          .evaluate((el) => el.getBoundingClientRect().bottom),
      ).toBeLessThan(viewport.height);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      fs.mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({
        path: `${screenshotDir}/${lang}-${viewport.width}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `${screenshotDir}/${lang}-${viewport.width}-hero.png`,
      });
      expect(errors).toEqual([]);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    });
  test(`${lang} routes, metadata, equivalent language links and internal links`, async ({
    page,
    request,
  }) => {
    const links = new Set<string>();
    for (const key of Object.keys(routes) as PageKey[]) {
      const route = pathFor(lang, key);
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://www.billbadran.com${route}`,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
      await expect(page.locator(".language")).toHaveAttribute(
        "href",
        pathFor(lang === "fr" ? "en" : "fr", key),
      );
      for (const href of await page
        .locator('a[href^="/"]')
        .evaluateAll((a) => a.map((x) => x.getAttribute("href")!)))
        links.add(href);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    for (const href of links) {
      const r = await request.get(href);
      expect(r.status(), href).toBe(200);
    }
    await page.goto(pathFor(lang, "investments"));
    await page.locator(".language").click();
    await expect(page).toHaveURL(
      new RegExp(pathFor(lang === "fr" ? "en" : "fr", "investments")),
    );
  });
  for (const width of [320, 375, 768])
    test(`${lang} layout all pages at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      for (const key of Object.keys(routes) as PageKey[]) {
        await page.goto(pathFor(lang, key));
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          key,
        ).toBe(true);
      }
    });
}
test("keyboard menu focus, Escape, reduced motion and 200% text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(
    page.getByText("Skip to content", { exact: true }),
  ).toBeFocused();
  const menu = page.locator(".menu-button");
  await menu.click();
  await expect(page.locator("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close ×" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.locator("dialog")).not.toBeVisible();
  await menu.click();
  await page
    .locator("dialog")
    .getByRole("link", { name: "Retirement", exact: true })
    .click();
  await expect(page).toHaveURL(/retirement-planning/);
  await expect(page.locator("dialog")).not.toBeVisible();
  await page.addStyleTag({ content: "html{font-size:200%}" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Long French words in a hero title are the usual culprit.
  await page.goto("/fr/confidentialite");
  await page.addStyleTag({ content: "html{font-size:200%}" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("checklist: no network or storage, editing, all yes, reset and print", async ({
  page,
}) => {
  await page.goto(pathFor("en", "resources"));
  await page.waitForLoadState("networkidle");
  // The checklist itself must send nothing. Static files the page fetches
  // lazily (images, the favicon) are not checklist traffic.
  const requests: string[] = [];
  page.on("request", (r) => {
    if (!/^\/(assets|_next\/static)\//.test(new URL(r.url()).pathname))
      requests.push(`${r.method()} ${r.url()}`);
  });
  await page.locator('[name="question-0"][value="no"]').check();
  await page.locator('[name="question-1"][value="unsure"]').check();
  await expect(page.locator("#agenda")).toHaveValue(/My retirement spending/);
  await expect(page.locator(".agenda")).toContainText("3 unanswered questions");
  await page.locator("#agenda").fill("My own discussion notes");
  await page.locator('[name="question-2"][value="no"]').check();
  await expect(page.locator("#agenda")).toHaveValue("My own discussion notes");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-agenda")).toBeVisible();
  await expect(page.locator(".site-header")).not.toBeVisible();
  await page.emulateMedia({ media: "screen" });
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("#agenda")).toHaveValue("");
  for (let i = 0; i < 5; i++)
    await page.locator(`[name="question-${i}"][value="yes"]`).check();
  await expect(page.locator(".agenda")).toContainText(
    "do not establish retirement readiness",
  );
  await expect(page.locator("#agenda")).toHaveValue("");
  await page.reload();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
});
test("fee inputs invalid states and table", async ({ page }) => {
  await page.goto("/en/tools/investment-fees");
  await page.locator("#number-0").fill("100");
  await page.locator("#number-1").fill("1");
  await page.locator("#number-2").fill("1");
  await expect(page.locator(".result")).toContainText("1");
  await page.getByText("View year-by-year data").click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.locator("#number-1").fill("1.5");
  await expect(page.locator(".tool-grid").getByRole("alert")).toBeVisible();
  await expect(page.locator(".result")).toHaveCount(0);
  await page.locator("#number-1").fill("0");
  await expect(page.locator(".result")).toContainText("0");
});
test("protected review, public draft exclusions and assets", async ({
  request,
}) => {
  const headers = {
    Authorization:
      "Basic " +
      Buffer.from("review-test:test-only-password").toString("base64"),
  };
  expect((await request.get("http://127.0.0.1:3101/en")).status()).toBe(401);
  const publicView = await request.get(
    "http://127.0.0.1:3101" + pathFor("en", "resources"),
    { headers },
  );
  expect(publicView.status()).toBe(200);
  expect(await publicView.text()).not.toContain("Read draft");
  expect(
    (
      await request.get(
        "http://127.0.0.1:3101/en/revision/five-years-before-retirement",
        { headers },
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(
        `${pathFor("en", "resources")}/five-years-before-retirement`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (await request.get("/en/revision/five-years-before-retirement")).status(),
  ).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("<loc>");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
  expect((await request.get("/reference/original.html")).status()).toBe(404);
  expect((await request.get("/assets/bill-portrait.jpg")).status()).toBe(200);
});
test("articles switch to exact translations and render safely", async ({
  page,
}) => {
  await page.goto("/fr/revision/cinq-ans-avant-la-retraite");
  await expect(page.locator(".review-label")).toContainText("non approuvé");
  await page.locator(".language").click();
  await expect(page).toHaveURL(/en\/revision\/five-years-before-retirement/);
  await expect(page.locator(".article-body h2")).toHaveCount(6);
});
test("no JavaScript still renders substantive content and links", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/fr");
  await expect(page.locator("h1")).toBeVisible();
  await page.locator(".hero .button").click();
  await expect(page.locator("h1")).toContainText("première rencontre");
  await context.close();
});
test("missing portrait has deliberate fallback; absent guides have no download claims", async ({
  page,
}) => {
  await page.route("**/_next/image*", (route) => route.abort());
  await page.goto("/en");
  await expect(
    page.locator(".hero-art").getByText("Portrait temporarily unavailable"),
  ).toBeVisible();
  await expect(page.locator("a[download]")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".hero-person .portrait-fallback")).toBeVisible();
  expect(
    await page
      .locator(".hero-person .portrait-fallback")
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBe(48);
});
test("contact: accepted only after confirmed response; no duplicate click or quiz data", async ({
  page,
}) => {
  let count = 0;
  let payload: Record<string, unknown> = {};
  await page.route("**/api/inquiry", async (route) => {
    count++;
    payload = route.request().postDataJSON();
    await new Promise((r) => setTimeout(r, 250));
    await route.fulfill({ status: 202, json: { code: "accepted" } });
  });
  await page.goto(pathFor("en", "meeting"));
  await page.locator("#name").fill("Test");
  await page.locator("#email").fill("test@example.invalid");
  await page.locator("#message").fill("Test message");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sending…", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText(
    "accepted by the sending service",
  );
  expect(count).toBe(1);
  expect(Object.keys(payload).sort()).toEqual([
    "email",
    "language",
    "message",
    "name",
    "requestId",
    "topic",
    "website",
  ]);
});
for (const [status, code] of [
  [400, "validation"],
  [429, "rate_limited"],
  [502, "provider_error"],
  [503, "timeout"],
] as const)
  test(`contact ${status} ${code} retains message for retry`, async ({
    page,
  }) => {
    await page.route("**/api/inquiry", (r) =>
      r.fulfill({ status, json: { code } }),
    );
    await page.goto(pathFor("fr", "meeting"));
    await page.locator("#name").fill("Test");
    await page.locator("#email").fill("test@example.invalid");
    await page.locator("#message").fill("Message conservé");
    await page
      .getByRole("button", { name: "Envoyer la demande", exact: true })
      .click();
    await expect(page.getByRole("status")).not.toBeEmpty();
    await expect(page.locator("#message")).toHaveValue("Message conservé");
    await expect(
      page.getByRole("button", { name: "Envoyer la demande", exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole("status")).not.toContainText("acceptée");
  });
test("contact native invalid input and browser request timeout", async ({
  page,
}) => {
  let count = 0;
  await page.route("**/api/inquiry", async (route) => {
    count++;
    await new Promise((r) => setTimeout(r, 17000));
    await route.abort().catch(() => {});
  });
  await page.goto(pathFor("en", "meeting"));
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  expect(count).toBe(0);
  await page.locator("#name").fill("Test");
  await page.locator("#email").fill("test@example.invalid");
  await page.locator("#message").fill("Keep my text");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("not confirmed", {
    timeout: 20000,
  });
  await expect(page.locator("#message")).toHaveValue("Keep my text");
});
test("API origin, length, schema and missing credentials", async ({
  request,
}) => {
  expect((await request.post("/api/inquiry", { data: {} })).status()).toBe(403);
  const headers = { Origin: "http://127.0.0.1:3100" };
  expect(
    (await request.post("/api/inquiry", { headers, data: {} })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/inquiry", {
        headers,
        data: { message: "x".repeat(13000) },
      })
    ).status(),
  ).toBe(413);
  const auth = {
    ...headers,
    Origin: "http://127.0.0.1:3101",
    Authorization:
      "Basic " +
      Buffer.from("review-test:test-only-password").toString("base64"),
  };
  const response = await request.post("http://127.0.0.1:3101/api/inquiry", {
    headers: auth,
    data: {
      name: "Test",
      email: "test@example.invalid",
      topic: "other",
      message: "Test",
      language: "en",
      website: "",
      requestId: "d5647485-a416-4a9c-a2d2-5cf23301b8cb",
    },
  });
  expect(response.status()).toBe(503);
});

test("mountain ride: scrolling walks the hiker through four acts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/fr");
  const ride = page.locator("#parcours");
  await expect(ride).toHaveAttribute("data-mode", "live");
  const scrollTo = (p: number) =>
    page.evaluate((p) => {
      const s = document.getElementById("parcours")!;
      const top = s.getBoundingClientRect().top + scrollY;
      window.scrollTo(0, top + (p / 4) * (s.offsetHeight - innerHeight));
    }, p);
  const walker = page.locator("[data-walker]");
  let lastX = -Infinity;
  for (const [p, act, pose] of [
    [0.05, 0, "stand"],
    [1.9, 1, "climb"],
    [2.95, 2, "stand"],
    [3.95, 3, "sit"],
  ] as const) {
    await scrollTo(p);
    await expect(ride.locator(`.ride-act[data-act="${act}"]`)).toHaveAttribute(
      "data-active",
      "true",
    );
    await expect(ride.locator('.ride-act[data-active="true"]')).toHaveCount(1);
    await expect(walker).toHaveAttribute("data-pose", pose);
    const x = Number(
      (await walker.getAttribute("transform"))!.match(
        /translate\(([\d.]+)/,
      )![1],
    );
    expect(x).toBeGreaterThan(lastX);
    lastX = x;
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(ride.locator('.ride-act[data-act="3"] a.button')).toBeVisible();
  // The rail jumps to an act without hijacking the scroll.
  await ride.locator(".ride-rail a").nth(1).click();
  await expect(ride.locator('.ride-act[data-act="1"]')).toHaveAttribute(
    "data-active",
    "true",
  );
});

test("mountain ride: reduced motion shows the four still panels", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/en");
  const ride = page.locator("#parcours");
  await expect(ride).toHaveAttribute("data-mode", "static");
  await expect(ride.locator(".ride-panel")).toHaveCount(4);
  await expect(ride.locator(".ride-panel h2").first()).toBeVisible();
  await expect(ride.locator(".ride-stage .ride-act h2").first()).toBeHidden();
  // Narration is still offered, and scrolling moves nothing in the panels.
  await expect(ride.locator(".ride-static [data-sound]")).toBeVisible();
  await ride.locator(".ride-panel").nth(1).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  expect(
    await page
      .locator("[data-word]")
      .evaluateAll((ws) => ws.map((w) => getComputedStyle(w).opacity)),
  ).not.toContain("0");
  await context.close();
});

test("mountain ride: tabbing to the last act shows that act alone", async ({
  page,
}) => {
  await page.goto("/fr");
  await page.locator('.ride-act[data-act="3"] a').focus();
  await expect(page.locator('.ride-act[data-act="3"]')).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect
    .poll(() =>
      page
        .locator(".ride-stage .ride-act")
        .evaluateAll(
          (acts) =>
            acts.filter(
              (a) =>
                getComputedStyle(a).visibility !== "hidden" &&
                Number(getComputedStyle(a).opacity) > 0.5,
            ).length,
        ),
    )
    .toBe(1);
});

test("narration: one English track that plays through the acts; none in French", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const w = window as unknown as { audios: HTMLMediaElement[] };
    w.audios = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!w.audios.includes(this)) w.audios.push(this);
      return play.call(this);
    };
  });
  const scrollTo = (p: number) =>
    page.evaluate((p) => {
      const s = document.getElementById("parcours")!;
      const top = s.getBoundingClientRect().top + scrollY;
      window.scrollTo(0, top + (p / 4) * (s.offsetHeight - innerHeight));
    }, p);
  const audio = () =>
    page.evaluate(() => {
      const [a] = (window as unknown as { audios: HTMLMediaElement[] }).audios;
      return { time: a.currentTime, paused: a.paused };
    });
  await page.goto("/fr");
  await expect(page.locator("#parcours")).toHaveAttribute("data-mode", "live");
  await expect(page.locator("[data-sound]")).toHaveCount(0);
  await page.goto("/en");
  const sound = page.locator(".ride-stage [data-sound]");
  await scrollTo(1.3);
  await sound.click();
  await expect(sound).toHaveAttribute("data-playing", "true");
  await expect(sound).toHaveText("Pause");
  // Starting mid-ride begins at that act's passage (9.81 s)...
  await expect.poll(async () => (await audio()).time).toBeGreaterThan(10.1);
  const before = (await audio()).time;
  expect(before).toBeLessThan(20);
  // ...and moving on to the next act does not cut or restart it.
  await scrollTo(2.4);
  await page.waitForTimeout(600);
  const after = await audio();
  expect(after.paused).toBe(false);
  expect(after.time).toBeGreaterThan(before);
  expect(after.time).toBeLessThan(23);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => (await audio()).paused).toBe(true);
  await scrollTo(3.6);
  await expect.poll(async () => (await audio()).paused).toBe(false);
  await sound.click();
  await expect(sound).toHaveAttribute("data-playing", "false");
  await expect(sound).toHaveText("Listen");
  await expect.poll(async () => (await audio()).paused).toBe(true);
  expect(errors).toEqual([]);
});
