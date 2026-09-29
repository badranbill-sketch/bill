// Copy this file to scripts/plates.tsx in a checkout of the guide/pre-retirement-guide branch
// (npm i there), then run it from that checkout to rebuild presentation/public/plates.

/**
 * Text-free "illustration plates" from the guide's drawings, for the
 * presentation video (a book flip that shows the art and none of the words).
 *
 *   node --import tsx scripts/plates.tsx [outDir]
 *   (default outDir: ../bill/presentation/public/plates)
 *
 * Each drawing is rendered with empty copy, then every <text>, leader line,
 * letter badge and label thread is stripped. The one pen stroke that points
 * at words from inside a Sketch layer (the arrow on the porch notebook) is
 * removed by patching a temporary copy of porch.tsx. Output follows the
 * site's standalone format (scripts/build-ink.tsx): inline <style> with the
 * ink classes and CSS-variable fallbacks, the wash filter in <defs>, but with
 * a per-file filter id (ink-wash-<name>) so several plates can share a page.
 * Previews are rendered on ivory into <outDir>/_preview with Chromium.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "@playwright/test";
import { InkDefs } from "../components/ink/primitives";
import { CoverArt } from "../guide/art/cover";
import { Storm } from "../guide/art/storm";
import { Horizons } from "../guide/art/horizons";
import { Canoe, Harbour } from "../guide/art/harbour";
import { Containers } from "../guide/art/containers";
import { TablePlan } from "../guide/art/plans";
import { SpendingTable } from "../guide/art/spending";

const OUT = path.resolve(
  process.argv[2] ?? "../bill/presentation/public/plates",
);
const PREVIEW = path.join(OUT, "_preview");
const CHROME =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/* Porch: drop the curved arrow drawn from the question to the list. */
async function loadPorch() {
  const src = fs.readFileSync("guide/art/porch.tsx", "utf8");
  const start = src.indexOf("  // A curved arrow from the question back to the list.");
  const end = src.indexOf("  const papers = (");
  if (start < 0 || end < start) throw new Error("porch.tsx: arrow block not found");
  const tmp = path.resolve("guide/art/_plate_porch.tsx");
  fs.writeFileSync(tmp, src.slice(0, start) + src.slice(end));
  try {
    return (await import(pathToFileURL(tmp).href)).Porch as typeof import("../guide/art/porch").Porch;
  } finally {
    fs.rmSync(tmp);
  }
}
const Porch = await loadPorch();

const lang = "en" as const;
type Plate = {
  name: string;
  depicts: string;
  el: ReactElement;
  /** Extra markup to strip beyond text, leaders and badges. */
  strip?: RegExp[];
  removed: string;
};
const PLATES: Plate[] = [
  {
    name: "cover-art",
    depicts:
      "A couple walking down a path through birches and spruce to a dock with two chairs on a lake; sailboat and low sun",
    el: createElement(CoverArt, { lang }),
    removed: "nothing (no lettering in the drawing)",
  },
  {
    name: "porch",
    depicts:
      "An open notebook on a porch table with coffee cup, reading glasses and pen, statements to the side, lake beyond the railing",
    el: createElement(Porch, { lang, list: [], question: "" }),
    removed:
      "handwritten list and question on the notebook, the curved arrow linking them, the words on the statements",
  },
  {
    name: "storm",
    depicts:
      "A squall with rain shafts over a lake: one small sailboat under it, another in clear weather near a dock",
    el: createElement(Storm, { lang }),
    removed: "nothing (no lettering in the drawing)",
  },
  {
    name: "horizons",
    depicts:
      "A path from the viewer to far hills with three trail posts (near, halfway, far) and two walkers, birches and spruce",
    el: createElement(Horizons, { lang, labels: ["", "", ""] }),
    removed: "three captions, their leader lines and a/b/c letter badges",
  },
  {
    name: "harbour",
    depicts:
      "A sheltered cove on a grey day: small boat tied at a dock behind a rocky point, rough open water under low cloud, a figure on shore",
    el: createElement(Harbour, { lang }),
    removed: "nothing (no lettering in the drawing)",
  },
  {
    name: "containers",
    depicts:
      "Five containers apart on a table: an envelope, a file folder, a small notebook, a stack of statements and a ledger",
    el: createElement(Containers, { lang, labels: ["", "", "", "", ""] }),
    removed: "five captions and their leader lines",
  },
  {
    name: "table-plan",
    depicts:
      "A long dining table seen from above: ten chairs, plates and place cards, an open notebook in the centre",
    el: createElement(TablePlan, {
      lang,
      cards: Array.from({ length: 10 }, () => ""),
      centre: "",
    }),
    // the pencil threads that ran from each name to the notebook
    strip: [
      /<path d="[^"]*" fill="none" stroke="var\(--pencil, #a7b4c3\)"[^>]*>(?:<\/path>)?/g,
    ],
    removed:
      "ten place-card names, the centre caption and the pencil threads linking names to the notebook",
  },
  {
    name: "spending",
    depicts:
      "A kitchen table from above: grocery list and keys, two tickets, a roofer's quote, a map with passports, a calendar page, coffee and glasses",
    el: createElement(SpendingTable, { lang }),
    removed:
      "handwritten words (list, quote, month) and the five numbered badges",
  },
  {
    name: "canoe",
    depicts:
      "A loaded canoe on the shore, pack in the middle and a paddle across the thwart, spruce at the edge",
    el: createElement(Canoe, { lang }),
    removed: "nothing (no lettering in the drawing)",
  },
];

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

// Ink styles without the text rules (nothing here is lettered any more),
// without width:100% so the explicit width/height hold when inlined, and
// clipped to the viewBox (some scenes run past it) so inline = <img>.
const css = fs
  .readFileSync("app/ink.css", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/\s*([{}:;,])\s*/g, "$1")
  .replace(/\.ink-defs\{[^}]*\}/, "")
  .replace(/\.ink-art\{[^}]*\}/, ".ink-art{display:block;overflow:hidden;}")
  .replace(/\.ink-art \.(note|label|leader)[^{]*\{[^}]*\}/g, "")
  .trim();
const filterDefs =
  renderToStaticMarkup(createElement(InkDefs)).match(
    /<defs>([\s\S]*)<\/defs>/,
  )?.[1] ?? "";

function detext(body: string, extra: RegExp[] = []) {
  let b = body
    .replace(/<text[\s\S]*?<\/text>/g, "")
    .replace(/<path[^>]*class="leader"[^>]*>(?:<\/path>)?/g, "")
    // letter/number badges drawn behind the removed words
    .replace(
      /<circle[^>]*fill="#faf9f5"[^>]*stroke="#a8875a"[^>]*>(?:<\/circle>)?/g,
      "",
    );
  for (const r of extra) b = b.replace(r, "");
  // drop groups left empty
  let prev;
  do {
    prev = b;
    b = b.replace(/<g>\s*<\/g>/g, "");
  } while (b !== prev);
  return b;
}

function standalone(p: Plate) {
  const markup = renderToStaticMarkup(p.el);
  const open = markup.match(/^<svg([^>]*)>/);
  if (!open || !markup.endsWith("</svg>"))
    throw new Error(`${p.name}: not a single <svg>`);
  const viewBox = attr(open[1], "viewBox")!;
  const [, , w, h] = viewBox.split(/\s+/).map(Number);
  const raw = markup.slice(open[0].length, -"</svg>".length);
  const id = `ink-wash-${p.name}`;
  const body = detext(raw, p.strip).replaceAll("url(#ink-wash)", `url(#${id})`);
  const filter = body.includes(`url(#${id})`)
    ? filterDefs.replace('id="ink-wash"', `id="${id}"`)
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}" class="ink-art" aria-hidden="true">` +
    `<style>${css}</style>` +
    (filter ? `<defs>${filter}</defs>` : "") +
    body +
    `</svg>`;
  const removedBytes = raw.length - detext(raw, p.strip).length;
  return { svg, w, h, removedBytes };
}

fs.mkdirSync(PREVIEW, { recursive: true });
const manifest: object[] = [];
const files: { name: string; w: number; h: number }[] = [];
for (const p of PLATES) {
  const { svg, w, h, removedBytes } = standalone(p);
  // checks: no words, no external references, filter id unique
  const bad = [/<text/, /class="(note|label|leader)"/, /\shref=/, /url\((?!#ink-wash-)/, /@import|@font-face/].filter(
    (r) => r.test(svg),
  );
  if (bad.length) throw new Error(`${p.name}: ${bad.join(", ")}`);
  fs.writeFileSync(path.join(OUT, `${p.name}.svg`), svg);
  files.push({ name: p.name, w, h });
  manifest.push({
    file: `${p.name}.svg`,
    name: p.name,
    width: w,
    height: h,
    depicts: p.depicts,
    elementsRemoved: removedBytes > 0,
    removed: removedBytes > 0 ? p.removed : "nothing",
  });
  console.log(`${p.name}.svg  ${w}×${h}  ${(svg.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(
  path.join(OUT, "plates.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

// Previews: each file loaded as an image on ivory, as the video will use it.
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
for (const f of files) {
  const page = await browser.newPage({
    viewport: { width: f.w + 48, height: f.h + 48 },
  });
  const data = fs.readFileSync(path.join(OUT, `${f.name}.svg`)).toString("base64");
  await page.setContent(
    `<body style="margin:0;padding:24px;background:#faf9f5"><img src="data:image/svg+xml;base64,${data}" width="${f.w}" height="${f.h}" style="display:block"></body>`,
  );
  await page.waitForFunction(() => document.images[0]?.complete);
  await page.screenshot({ path: path.join(PREVIEW, `${f.name}.png`) });
  await page.close();
}
await browser.close();
console.log(`plates: ${files.length} files in ${OUT}`);
