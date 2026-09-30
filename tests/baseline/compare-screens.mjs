#!/usr/bin/env node
/**
 * BASE02 before/after comparison (F03).
 *
 *   node tests/baseline/compare-screens.mjs --before DIR --after DIR --diff DIR [--threshold 0.1]
 *
 * DIR is a BASE02_OUT directory written by tests/baseline/screens.spec.ts (PNGs + records/*.json).
 * For every screenshot: byte identity, exact pixel mismatch count, and a pixelmatch count (per-pixel colour
 * threshold, anti-aliasing detection on). Sizes that differ are compared on the union canvas (missing area counts
 * as changed). Status per screenshot:
 *   identical         sizes match and every pixel is equal (byte_identical says whether the PNG files are too)
 *   within_threshold  sizes match, pixelmatch finds 0 differing pixels, but exact_diff_pixels > 0 (sub-threshold
 *                     colour or anti-aliasing differences; reported separately, not counted as identical)
 *   changed           otherwise, with diff % = pixelmatch differing pixels / union canvas pixels
 * A diff PNG is written for every changed shot. Records (HTTP status, console/page errors, bad responses,
 * overflow) are compared field by field. Writes DIFF/report.json and prints a table.
 * Exit 0 when every screenshot is identical or within_threshold and no record differs; 1 when anything changed or
 * is missing, or when there is nothing to compare (no screenshot on either side); 2 on a usage error.
 */
import fs from "node:fs";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const before = opt("before");
const after = opt("after");
const diffDir = opt("diff");
const threshold = Number(opt("threshold", "0.1"));
if (!before || !after || !diffDir) {
  console.error(
    "usage: compare-screens.mjs --before DIR --after DIR --diff DIR [--threshold 0.1]",
  );
  process.exit(2);
}
fs.mkdirSync(diffDir, { recursive: true });

const pngs = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".png"))
        .sort()
    : [];
const records = (dir) => {
  const d = path.join(dir, "records");
  const out = {};
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json")))
    out[f.replace(/\.json$/, "")] = JSON.parse(
      fs.readFileSync(path.join(d, f), "utf8"),
    );
  return out;
};

/** Copies `img` onto a width x height canvas; area outside the source is opaque magenta (always "different"). */
function pad(img, width, height) {
  if (img.width === width && img.height === height) return img.data;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) out.writeUInt32BE(0xff00ffff, i * 4);
  for (let y = 0; y < img.height; y++)
    img.data.copy(
      out,
      y * width * 4,
      y * img.width * 4,
      (y + 1) * img.width * 4,
    );
  return out;
}

const shots = [];
const names = [...new Set([...pngs(before), ...pngs(after)])].sort();
for (const name of names) {
  const id = name.replace(/\.png$/, "");
  const a = path.join(before, name);
  const b = path.join(after, name);
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    shots.push({
      id,
      status: fs.existsSync(a) ? "missing_after" : "missing_before",
    });
    continue;
  }
  const ba = fs.readFileSync(a);
  const bb = fs.readFileSync(b);
  const ia = PNG.sync.read(ba);
  const ib = PNG.sync.read(bb);
  const width = Math.max(ia.width, ib.width);
  const height = Math.max(ia.height, ib.height);
  const da = pad(ia, width, height);
  const db = pad(ib, width, height);
  let exact = 0;
  for (let i = 0; i < da.length; i += 4)
    if (da.readUInt32BE(i) !== db.readUInt32BE(i)) exact++;
  const out = new PNG({ width, height });
  const pm = pixelmatch(da, db, out.data, width, height, {
    threshold,
    includeAA: false,
  });
  const sameSize = ia.width === ib.width && ia.height === ib.height;
  const status =
    !sameSize || pm > 0
      ? "changed"
      : exact === 0
        ? "identical"
        : "within_threshold";
  let diffFile = null;
  if (status === "changed") {
    diffFile = `${id}.diff.png`;
    fs.writeFileSync(path.join(diffDir, diffFile), PNG.sync.write(out));
  }
  shots.push({
    id,
    status,
    byte_identical: ba.equals(bb),
    size_before: `${ia.width}x${ia.height}`,
    size_after: `${ib.width}x${ib.height}`,
    exact_diff_pixels: exact,
    pixelmatch_diff_pixels: pm,
    diff_pct: Number(((pm / (width * height)) * 100).toFixed(4)),
    diff_png: diffFile,
  });
}

const FIELDS = [
  "http_status",
  "final_url",
  "console_errors",
  "page_errors",
  "failed_requests",
  "bad_responses",
  "horizontal_overflow",
  "images_incomplete",
  "journey",
  "inquiry_form",
  "contact_section",
  "entry",
  "api_guide",
];
const ra = records(before);
const rb = records(after);
const recordDiffs = [];
for (const id of [
  ...new Set([...Object.keys(ra), ...Object.keys(rb)]),
].sort()) {
  if (!ra[id] || !rb[id]) {
    recordDiffs.push({ id, field: "*", before: !!ra[id], after: !!rb[id] });
    continue;
  }
  for (const f of FIELDS) {
    const x = JSON.stringify(ra[id][f] ?? null);
    const y = JSON.stringify(rb[id][f] ?? null);
    if (x !== y)
      recordDiffs.push({ id, field: f, before: ra[id][f], after: rb[id][f] });
  }
}

const count = (s) => shots.filter((x) => x.status === s).length;
const report = {
  generated_at: new Date().toISOString(),
  before: path.resolve(before),
  after: path.resolve(after),
  pixelmatch: { threshold, includeAA: false },
  summary: {
    screenshots: shots.length,
    identical: count("identical"),
    within_threshold: count("within_threshold"),
    changed: count("changed"),
    missing_before: count("missing_before"),
    missing_after: count("missing_after"),
    record_differences: recordDiffs.length,
  },
  shots,
  record_differences: recordDiffs,
};
fs.writeFileSync(
  path.join(diffDir, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
for (const s of shots)
  console.log(
    `${s.id.padEnd(24)} ${s.status.padEnd(14)} ${s.diff_pct ?? ""}${s.diff_pct !== undefined ? "%" : ""} ${s.size_before ?? ""}${s.size_before && s.size_before !== s.size_after ? " -> " + s.size_after : ""}`,
  );
for (const d of recordDiffs)
  console.log(
    `record ${d.id} ${d.field}: ${JSON.stringify(d.before)} -> ${JSON.stringify(d.after)}`,
  );
console.log(JSON.stringify(report.summary));
if (!shots.length)
  console.error(`nothing to compare: no screenshot in ${before} or ${after}`);
process.exit(
  !shots.length ||
    report.summary.changed ||
    report.summary.missing_before ||
    report.summary.missing_after ||
    report.summary.record_differences
    ? 1
    : 0,
);
