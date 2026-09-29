/**
 * Builds the guide: one PDF per language, set in the site's fonts, with the
 * drawings inline as vectors.
 *
 *   node --import tsx guide/build.tsx                 both languages
 *   node --import tsx guide/build.tsx en --png        English, plus page PNGs
 *   node --import tsx guide/build.tsx fr --pages 5-9  only those pages (PNGs)
 *   node --import tsx guide/build.tsx --final         the approved edition
 *
 * Output (guide/dist/):
 *   <name>.pdf         screen edition: warm paper and a faint grain
 *   <name>-print.pdf   print edition: no paper tint, for any printer
 *   <name>.html        the same pages as one HTML file (fonts embedded)
 *
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE picks the browser, as for scripts/ink-preview.tsx.
 */
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";
import { InkDefs } from "../components/ink/primitives";
import type { Language } from "../lib/business";
import { business } from "../lib/business";
import { copy } from "./copy";
import { Guide } from "./layout";

const args = process.argv.slice(2);
const langs = (args.filter((a) => a === "en" || a === "fr") as Language[])
  .length
  ? (args.filter((a) => a === "en" || a === "fr") as Language[])
  : (["en", "fr"] as Language[]);
const png = args.includes("--png") || args.includes("--pages");
const final = args.includes("--final");
if (final)
  for (const lang of langs)
    if (!copy[lang].colophon.disclosure)
      throw new Error(
        `--final needs the approved registration and firm disclosure in guide/copy.ts (${lang}.colophon.disclosure)`,
      );
const pagesArg = args[args.indexOf("--pages") + 1];
const only =
  args.includes("--pages") && pagesArg
    ? new Set(
        pagesArg.split(",").flatMap((r) => {
          const [a, b = a] = r.split("-").map(Number);
          return Array.from({ length: b - a + 1 }, (_, i) => a + i);
        }),
      )
    : null;
const pngDir = process.env.GUIDE_PNG_DIR || "guide/dist/pages";
const OUT = "guide/dist";

const root = path.resolve(import.meta.dirname, "..");
const file = (p: string) => fs.readFileSync(path.resolve(root, p));
const dataUri = (p: string, type: string) =>
  `data:${type};base64,${file(p).toString("base64")}`;
const font = (pkg: string, f: string) =>
  dataUri(`node_modules/@fontsource/${pkg}/files/${f}`, "font/woff2");

const faces = [
  ["Newsreader", "newsreader", 300, "normal"],
  ["Newsreader", "newsreader", 300, "italic"],
  ["Newsreader", "newsreader", 400, "normal"],
  ["Newsreader", "newsreader", 400, "italic"],
  ["Source Sans 3", "source-sans-3", 400, "normal"],
  ["Source Sans 3", "source-sans-3", 400, "italic"],
  ["Source Sans 3", "source-sans-3", 600, "normal"],
  ["Caveat", "caveat", 400, "normal"],
  ["Caveat", "caveat", 500, "normal"],
] as const;
const fontCss = faces
  .map(
    ([family, pkg, weight, style]) =>
      `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};font-display:block;src:url(${font(
        pkg,
        `${pkg}-latin-${weight}-${style}.woff2`,
      )}) format("woff2")}`,
  )
  .join("\n");

const monogram = `url("data:image/svg+xml;base64,${file("public/assets/monogram.svg").toString("base64")}")`;
const penLine = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 6' preserveAspectRatio='none'%3E%3Cpath d='M1 4.1C17 2.7 35 3.5 53 3.1S89 2.3 119 3.7' fill='none' stroke='%23a8875a' stroke-width='1.3' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")`;
const css = [
  fontCss,
  `:root{--grain:url(${dataUri("guide/assets/grain.png", "image/png")});--monogram:${monogram};--pen-line:${penLine}}`,
  file("guide/style.css").toString(),
  file("app/ink.css").toString(),
].join("\n");
const portrait = dataUri("public/assets/bill-portrait.jpg", "image/jpeg");

function html(lang: Language, edition: "screen" | "print") {
  const c = copy[lang];
  const body = renderToStaticMarkup(
    createElement(Guide, { lang, final }),
  ).replace('src="PORTRAIT"', `src="${portrait}"`);
  return `<!doctype html>
<html lang="${lang === "fr" ? "fr-CA" : "en-CA"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${c.meta.title}</title>
<meta name="author" content="${business.name}">
<meta name="description" content="${c.meta.subject}">
<style>${css}</style>
</head>
<body class="${edition}">
${renderToStaticMarkup(createElement(InkDefs))}
${body}
</body>
</html>`;
}

/**
 * Watercolour washes use an SVG filter (grain and a wandering edge), which
 * a PDF cannot hold: Chromium would rasterise every wash as a large
 * transparent image. Instead, each drawing's washes are photographed once
 * on white, as a JPEG, and laid under its ink lines with a multiply blend.
 * The ink, hatching and type stay vector.
 */
async function bakeWashes(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      .wash-pass .page { background: #fff !important; box-shadow: none !important; }
      .wash-pass .page * { visibility: hidden !important; }
      .wash-pass .art svg .wash, .wash-pass .art svg .wash * { visibility: visible !important; }
      .washes-baked .art svg .wash { display: none; }
      .art .wash-img { position: absolute; inset: 0; width: 100%; height: 100%; mix-blend-mode: multiply; pointer-events: none; }
      .art svg { position: relative; }
    `,
  });
  await page.evaluate(() => document.body.classList.add("wash-pass"));
  const arts = page.locator(".art");
  const n = await arts.count();
  const shots: (string | null)[] = [];
  for (let i = 0; i < n; i++) {
    const has = await arts.nth(i).evaluate((el) => !!el.querySelector(".wash"));
    if (!has) {
      shots.push(null);
      continue;
    }
    const box = await arts.nth(i).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + window.scrollX,
        y: r.top + window.scrollY,
        width: r.width,
        height: r.height,
      };
    });
    const buf = await page.screenshot({
      type: "jpeg",
      quality: 82,
      scale: "device",
      fullPage: true,
      clip: box,
    });
    shots.push(`data:image/jpeg;base64,${buf.toString("base64")}`);
  }
  await page.evaluate((srcs) => {
    document.body.classList.remove("wash-pass");
    document.body.classList.add("washes-baked");
    document.querySelectorAll(".art").forEach((el, i) => {
      const src = srcs[i];
      if (!src) return;
      const img = document.createElement("img");
      img.className = "wash-img";
      img.alt = "";
      img.src = src;
      el.prepend(img);
    });
  }, shots);
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((im) =>
        im.complete ? null : new Promise((r) => (im.onload = r)),
      ),
    ),
  );
}

/**
 * Chromium tags every image with an sRGB ICC profile. pdfium (the viewer in
 * Chrome and many apps) colour-manages ICC-tagged images but not the page's
 * vector colours, which shifts the pale washes toward pink. The profiles are
 * plain sRGB, so declaring the images DeviceRGB changes nothing for other
 * viewers and makes pdfium match. Same byte length, so the xref stays valid.
 */
function untagImages(file: string) {
  const pdf = fs.readFileSync(file).toString("latin1");
  const out = pdf.replace(/\/ColorSpace \[\/ICCBased \d+ 0 R\]/g, (m) =>
    "/ColorSpace /DeviceRGB".padEnd(m.length, " "),
  );
  fs.writeFileSync(file, Buffer.from(out, "latin1"));
}

fs.mkdirSync(OUT, { recursive: true });
if (png) fs.mkdirSync(pngDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
for (const lang of langs) {
  const name = copy[lang].meta.file;
  for (const edition of ["screen", "print"] as const) {
    if (only && edition === "print") continue;
    const page = await browser.newPage({
      viewport: { width: 864, height: 1100 },
      deviceScaleFactor: 2,
    });
    const doc = html(lang, edition);
    if (edition === "screen" && !only)
      fs.writeFileSync(path.join(OUT, `${name}.html`), doc);
    await page.setContent(doc, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const count = await page.locator("section.page").count();
    if (!only) await bakeWashes(page);
    if (count % 4 !== 0)
      console.warn(`${lang}: ${count} pages (not a multiple of 4)`);
    if (!only) {
      const pdf = path.join(
        OUT,
        `${name}${edition === "print" ? "-print" : ""}.pdf`,
      );
      await page.emulateMedia({ media: "print" });
      await page.pdf({
        path: pdf,
        preferCSSPageSize: true,
        printBackground: true,
        tagged: true,
        outline: false,
      });
      untagImages(pdf);
      await page.emulateMedia({ media: "screen" });
      console.log(
        `${pdf}  ${count} pages, ${(fs.statSync(pdf).size / 1024 / 1024).toFixed(1)} MB`,
      );
    }
    if (png && edition === "screen") {
      const zoom = Number(process.env.GUIDE_PNG_ZOOM || 1);
      const shot = await browser.newPage({
        viewport: { width: 864, height: 1100 },
        deviceScaleFactor: zoom,
      });
      await shot.setContent(doc, { waitUntil: "load" });
      await shot.evaluate(() => document.fonts.ready);
      for (let i = 0; i < count; i++) {
        if (only && !only.has(i + 1)) continue;
        await shot
          .locator("section.page")
          .nth(i)
          .screenshot({
            path: path.join(
              pngDir,
              `${lang}-${String(i + 1).padStart(2, "0")}.png`,
            ),
          });
      }
      await shot.close();
    }
    await page.close();
  }
}
await browser.close();
