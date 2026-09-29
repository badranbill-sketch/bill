/**
 * Render several illustration components side by side into one PNG, to
 * compare drawings while working on them.
 *
 *   node --import tsx scripts/ink-sheet.tsx out.png [cols] [zoom] module:Export[:lang] …
 *
 * Same fonts, ink styles and paper as scripts/ink-preview.tsx.
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE picks the browser.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";
import { InkDefs } from "../components/ink/primitives";

const [out, cols = "3", zoom = "1", ...specs] = process.argv.slice(2);
if (!out || !specs.length) {
  console.error(
    "usage: ink-sheet.tsx <out.png> [cols] [zoom] module:Export[:lang] …",
  );
  process.exit(1);
}
const cells: string[] = [];
for (const spec of specs) {
  const [file, name, lang] = spec.split(":");
  const mod = (await import(pathToFileURL(path.resolve(file)).href)) as Record<
    string,
    ComponentType<Record<string, unknown>>
  >;
  const Comp = mod[name];
  if (!Comp) throw new Error(`${file} has no export ${name}`);
  cells.push(
    `<figure><figcaption>${name}${lang ? ` (${lang})` : ""}</figcaption>${renderToStaticMarkup(
      createElement(Comp, lang ? { lang } : {}),
    )}</figure>`,
  );
}
const font = (pkg: string, f: string) =>
  "data:font/woff2;base64," +
  fs
    .readFileSync(path.resolve("node_modules/@fontsource", pkg, "files", f))
    .toString("base64");
const css = fs.readFileSync(path.resolve("app/ink.css"), "utf8");
const width = 1400;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Caveat;src:url(${font("caveat", "caveat-latin-400-normal.woff2")})}
@font-face{font-family:Newsreader;font-style:italic;src:url(${font("newsreader", "newsreader-latin-400-italic.woff2")})}
:root{--hand:Caveat;--serif:Newsreader}
body{margin:0;padding:24px;background:#faf9f5;width:${width}px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;font:12px sans-serif;color:#4e5b68}
figure{margin:0}
${css}</style></head><body>${renderToStaticMarkup(createElement(InkDefs))}${cells.join("")}</body></html>`;
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
const page = await browser.newPage({
  viewport: { width: width + 48, height: 400 },
  deviceScaleFactor: Number(zoom),
});
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
