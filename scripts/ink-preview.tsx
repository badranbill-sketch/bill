/**
 * Render one illustration component to a PNG, outside Next, to look at it
 * while drawing.
 *
 *   node --import tsx scripts/ink-preview.tsx components/ink/desk.tsx HeroDesk out.png [width] [zoom]
 *
 * Uses the site's ink styles and fonts, on the site's paper colour.
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE picks the browser (e.g. /usr/bin/chromium).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";
import { InkDefs } from "../components/ink/primitives";

const [file, name, out, width = "900", zoom = "1"] = process.argv.slice(2);
if (!file || !name || !out) {
  console.error(
    "usage: ink-preview.tsx <module> <export> <out.png> [width] [zoom]",
  );
  process.exit(1);
}
const mod = (await import(pathToFileURL(path.resolve(file)).href)) as Record<
  string,
  ComponentType<Record<string, unknown>>
>;
const Comp = mod[name];
if (!Comp) throw new Error(`${file} has no export ${name}`);
// Fonts inline as data URIs: a page set from a string may not load file:// fonts.
const font = (pkg: string, f: string) =>
  "data:font/woff2;base64," +
  fs
    .readFileSync(path.resolve("node_modules/@fontsource", pkg, "files", f))
    .toString("base64");
const css = fs.readFileSync(path.resolve("app/ink.css"), "utf8");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Caveat;src:url(${font("caveat", "caveat-latin-400-normal.woff2")})}
@font-face{font-family:Caveat;font-weight:600;src:url(${font("caveat", "caveat-latin-600-normal.woff2")})}
@font-face{font-family:Newsreader;src:url(${font("newsreader", "newsreader-latin-400-normal.woff2")})}
:root{--hand:Caveat}
body{margin:0;padding:24px;background:#faf9f5;width:${width}px}
${css}</style></head><body>${renderToStaticMarkup(createElement(InkDefs))}${renderToStaticMarkup(
  createElement(Comp),
)}</body></html>`;
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
const page = await browser.newPage({
  viewport: { width: Number(width) + 48, height: 400 },
  deviceScaleFactor: Number(zoom),
});
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`${out}  (${(html.length / 1024).toFixed(0)} KB of markup)`);
