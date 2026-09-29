/**
 * Writes the static pen-and-ink drawings to public/assets/ink/ as standalone
 * SVG files, with a manifest in lib/ink-files.json.
 *
 * Why: an SVG drawn by a server component is sent twice, once in the HTML
 * and once in the React payload, and is never cached. A file is sent once,
 * cached for good (its name carries a content hash) and loaded lazily below
 * the fold. The mountain ride stays inline because the scroll engine moves
 * parts of it.
 *
 * An SVG shown as an image cannot use the page's fonts, so handwritten notes
 * and printed labels are turned into outlines here, from the same font files
 * the site serves.
 *
 *   node --import tsx scripts/build-ink.tsx      (runs before dev and build)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import opentype from "opentype.js";
import { HeroDesk, HeroDeskOverlay } from "../components/ink/desk";
import { Dock, TwoChairs } from "../components/ink/meeting";
import { VIGNETTES } from "../components/ink/vignettes";
import { InkDefs } from "../components/ink/primitives";

type Lang = "fr" | "en";
const LANGS: Lang[] = ["fr", "en"];
const OUT = "public/assets/ink";
const MANIFEST = "lib/ink-files.json";

const DRAWINGS: Record<string, ComponentType<{ lang?: Lang }>> = {
  desk: HeroDesk,
  "desk-caption": HeroDeskOverlay,
  "two-chairs": TwoChairs,
  dock: Dock,
  ...Object.fromEntries(
    Object.entries(VIGNETTES).map(([k, v]) => [
      k.replace(/[A-Z]/g, (c, i) => (i ? "-" : "") + c.toLowerCase()),
      v,
    ]),
  ),
};

const font = (file: string) => {
  const b = fs.readFileSync(path.resolve("node_modules/@fontsource", file));
  return opentype.parse(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
};
const FONTS = {
  note: font("caveat/files/caveat-latin-400-normal.woff"),
  label: font("newsreader/files/newsreader-latin-400-italic.woff"),
};
const FILL = { note: "#173450", label: "#173450" };

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const unescape = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const UNIT = 100; // glyphs are stored at this size, in whole units

/**
 * A glyph outline as compact relative commands on a whole-unit grid. It
 * reads opentype's commands directly: in opentype.js 2 they are already in
 * SVG orientation, and toPathData() would flip them upside down.
 */
function compact(p: opentype.Path) {
  let out = "",
    cx = 0,
    cy = 0,
    sx = 0,
    sy = 0;
  const num = (v: number) =>
    out && !/[a-z]$/.test(out) && v >= 0 ? ` ${v}` : String(v);
  for (const c of p.commands) {
    if (c.type === "Z") {
      out += "z";
      [cx, cy] = [sx, sy];
      continue;
    }
    const pts: [number, number][] =
      c.type === "Q"
        ? [
            [c.x1, c.y1],
            [c.x, c.y],
          ]
        : c.type === "C"
          ? [
              [c.x1, c.y1],
              [c.x2, c.y2],
              [c.x, c.y],
            ]
          : [[c.x, c.y]];
    const r = pts.map(([x, y]) => [Math.round(x), Math.round(y)]);
    const d = r.flatMap(([x, y]) => [x - cx, y - cy]);
    // Lines that go nowhere on this grid are dropped.
    if (c.type === "L" && d.every((n) => n === 0)) continue;
    out += c.type.toLowerCase();
    for (const n of d) out += num(n);
    [cx, cy] = r[r.length - 1];
    if (c.type === "M") [sx, sy] = [cx, cy];
  }
  return out;
}

/**
 * <text class="note|label"> → the same words as outlines. Each glyph is
 * defined once per file and placed with <use>, so a word costs a few bytes
 * per letter rather than a full outline.
 */
function outline(svg: string) {
  const glyphs = new Map<string, { id: string; d: string }>();
  const body = svg.replace(
    /<text([^>]*)>([\s\S]*?)<\/text>/g,
    (_, attrs: string, inner: string) => {
      const kind = /class="[^"]*\blabel\b/.test(attrs) ? "label" : "note";
      const f = FONTS[kind];
      const text = unescape(inner);
      const size = Number(attr(attrs, "font-size") ?? 20);
      const x = Number(attr(attrs, "x") ?? 0),
        y = Number(attr(attrs, "y") ?? 0);
      const anchor = attr(attrs, "text-anchor");
      const width = f.getAdvanceWidth(text, size);
      const x0 =
        anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
      const uses: string[] = [];
      f.forEachGlyph(text, x0, y, size, undefined, (g, gx, gy) => {
        const key = `${kind}:${g.index}`;
        let entry = glyphs.get(key);
        if (!entry) {
          const d = compact(g.getPath(0, 0, UNIT));
          if (!d) return;
          entry = { id: `${kind[0]}${g.index}`, d };
          glyphs.set(key, entry);
        }
        uses.push(
          `<use href="#${entry.id}" transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${+(size / UNIT).toFixed(4)})"/>`,
        );
      });
      const transform = attr(attrs, "transform");
      return `<g fill="${FILL[kind]}"${transform ? ` transform="${transform}"` : ""}>${uses.join("")}</g>`;
    },
  );
  const defs = [...glyphs.values()]
    .map((g) => `<path id="${g.id}" d="${g.d}"/>`)
    .join("");
  return { body, glyphs: defs };
}

const css = fs
  .readFileSync("app/ink.css", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{}:;,])\s*/g, "$1")
  .trim();
const defs =
  renderToStaticMarkup(createElement(InkDefs)).match(
    /<defs>[\s\S]*<\/defs>/,
  )?.[0] ?? "";

function standalone(markup: string) {
  const open = markup.match(/^<svg([^>]*)>/);
  if (!open) throw new Error("drawing does not render a single <svg>");
  const viewBox = attr(open[1], "viewBox")!;
  const [, , w, h] = viewBox.split(/\s+/).map(Number);
  const alt = attr(open[1], "aria-label");
  const { body, glyphs } = outline(
    markup.slice(open[0].length, -"</svg>".length),
  );
  const filter = body.includes("url(#ink-wash)")
    ? defs.slice("<defs>".length, -"</defs>".length)
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}" class="ink-art">` +
    `<style>${css}</style>` +
    (filter || glyphs ? `<defs>${filter}${glyphs}</defs>` : "") +
    body +
    `</svg>`;
  return { svg, w, h, alt: alt ? unescape(alt) : "" };
}

type Entry = {
  w: number;
  h: number;
  files: Record<Lang, string>;
  alt: Record<Lang, string>;
};
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const manifest: Record<string, Entry> = {};
let total = 0;
for (const [name, Comp] of Object.entries(DRAWINGS)) {
  const out = LANGS.map((lang) =>
    standalone(renderToStaticMarkup(createElement(Comp, { lang }))),
  );
  const same = out[0].svg === out[1].svg;
  const entry: Entry = {
    w: out[0].w,
    h: out[0].h,
    files: { fr: "", en: "" },
    alt: { fr: out[0].alt, en: out[1].alt },
  };
  LANGS.forEach((lang, i) => {
    const { svg } = out[same ? 0 : i];
    const hash = crypto
      .createHash("sha256")
      .update(svg)
      .digest("hex")
      .slice(0, 10);
    const file = `${name}${same ? "" : `-${lang}`}.${hash}.svg`;
    if (!same || i === 0) {
      fs.writeFileSync(path.join(OUT, file), svg);
      total += svg.length;
    }
    entry.files[lang] = file;
  });
  manifest[name] = entry;
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `ink: ${Object.keys(manifest).length} drawings, ${(total / 1024).toFixed(0)} KB in ${OUT}`,
);
