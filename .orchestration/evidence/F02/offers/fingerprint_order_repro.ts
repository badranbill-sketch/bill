// F02 offers lane, repair attempt 2 (A6D-04): what does the existing article
// fingerprint actually depend on? Uses the real lib/articles.ts, read only.
// Target: codex 66cce52, lib/articles.ts blob df24ccb1 (identical blob on main), zod 4.6.5.
// Run from the codex worktree so tsx and zod resolve:
//   cd <scratchpad>/wt/base01-codex && node --import tsx /home/user/bill/.orchestration/evidence/F02/offers/fingerprint_order_repro.ts
// All article data below is fictional.
import { createHash } from "node:crypto";
import {
  parseArticle,
  articleSchema,
} from "/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/base01-codex/lib/articles.ts";

const fm: Record<string, unknown> = {
  language: "en",
  translationGroup: "fixture-order",
  slug: "fixture-order",
  title: "Fictional fixture article title",
  description: "A fictional description used only for this test.",
  topic: "retirement",
  sources: [
    { title: "Fixture source A", url: "https://Example.com/source-a", accessed: "2026-09-30" },
    { title: "Fixture source B", url: "https://example.com/source-b", accessed: "2026-09-29" },
  ],
  author: null,
  reviewer: null,
  status: "draft",
  publicationDate: null,
  substantiveReviewDate: null,
  nextReviewDate: null,
  relatedServices: ["retirement", "investments"],
  relatedArticles: ["fixture-one", "fixture-two"],
  generation: "human",
  firmApprovalRequired: true,
};
const body = Array.from({ length: 240 }, (_, i) => "word" + i).join(" ") + "\n";
const file = (f: Record<string, unknown>, b = body, indent: number | undefined = 2) =>
  `---\n${JSON.stringify(f, null, indent)}\n---\n${b}`;
const hashOf = (f: Record<string, unknown>, b = body, indent: number | undefined = 2) =>
  parseArticle(file(f, b, indent), "fixture.md").hash;

const base = hashOf(fm);
let failures = 0;
const check = (label: string, actual: string, expectSame: boolean) => {
  const same = actual === base;
  const ok = same === expectSame;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(58)} ${same ? "SAME hash" : "different hash"} (expected ${expectSame ? "same" : "different"})`,
  );
};

console.log("baseline (file in schema order):", base);

// Key order and formatting: not part of the fingerprint.
check("top-level keys reversed", hashOf(Object.fromEntries(Object.entries(fm).reverse())), true);
check(
  "keys inside each source object reordered",
  hashOf({
    ...fm,
    sources: (fm.sources as Record<string, string>[]).map((s) => ({ accessed: s.accessed, url: s.url, title: s.title })),
  }),
  true,
);
check("frontmatter compact (no indentation) instead of pretty", hashOf(fm, body, undefined), true);

// Excluded fields: not part of the fingerprint.
check(
  "status/reviewer/3 dates changed (excluded fields)",
  hashOf({
    ...fm,
    status: "published",
    reviewer: "Fixture Reviewer",
    publicationDate: "2026-10-01",
    substantiveReviewDate: "2026-10-01",
    nextReviewDate: "2027-10-01",
  }),
  true,
);

// Unknown key inside a source object: zod z.object() strips it (only the top level is .strict()).
check(
  "unknown key added inside a source object (stripped)",
  hashOf({
    ...fm,
    sources: (fm.sources as Record<string, string>[]).map((s, i) => (i === 0 ? { ...s, note: "fixture" } : s)),
  }),
  true,
);

// Substance: part of the fingerprint.
check("title changed (control)", hashOf({ ...fm, title: "Fictional fixture article title!" }), false);
check("sources array order swapped", hashOf({ ...fm, sources: [...(fm.sources as unknown[])].reverse() }), false);
check("relatedArticles order swapped", hashOf({ ...fm, relatedArticles: ["fixture-two", "fixture-one"] }), false);
check("relatedServices order swapped", hashOf({ ...fm, relatedServices: ["investments", "retirement"] }), false);
check("body: one trailing space added", hashOf(fm, body.replace(/\n$/, " \n")), false);
check("source url letter case changed", hashOf({
  ...fm,
  sources: (fm.sources as Record<string, string>[]).map((s, i) => (i === 0 ? { ...s, url: "https://example.com/source-a" } : s)),
}), false);

// Unknown top-level key: rejected by .strict(), so no fingerprint at all.
try {
  hashOf({ ...fm, extra: "fixture" });
  failures++;
  console.log("FAIL  unknown top-level key accepted");
} catch {
  console.log("PASS  unknown top-level key rejected by articleSchema.strict() (no hash)");
}

// Reference definition of the method, written independently of contentFingerprint:
// JSON.stringify (no whitespace) of the substance fields in articleSchema declaration
// order, each source as {title,url,accessed}, then body; sha256 hex.
const EXCLUDED = new Set(["status", "reviewer", "publicationDate", "substantiveReviewDate", "nextReviewDate"]);
const schemaOrder = Object.keys(articleSchema.shape);
console.log("articleSchema key order:", schemaOrder.join(","));
const reference = (f: Record<string, unknown>, b: string) => {
  const obj: Record<string, unknown> = {};
  for (const k of schemaOrder) {
    if (EXCLUDED.has(k)) continue;
    obj[k] =
      k === "sources"
        ? (f.sources as Record<string, string>[]).map((s) => ({ title: s.title, url: s.url, accessed: s.accessed }))
        : f[k];
  }
  obj.body = b;
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
};
const reversedFm = Object.fromEntries(Object.entries(fm).reverse());
const refOk = reference(reversedFm, body) === hashOf(reversedFm);
if (!refOk) failures++;
console.log(`${refOk ? "PASS" : "FAIL"}  reference definition (schema order, then body) equals contentFingerprint for a reversed-key file`);

// French: typography is display-only; the hash is over the raw text.
const frFm = { ...fm, language: "fr", title: "Titre fictif de test : retraite" };
const frParsed = parseArticle(file(frFm), "fixture-fr.md");
const frOk = frParsed.hash === reference(frFm, body) && frParsed.title !== frFm.title;
if (!frOk) failures++;
console.log(`${frOk ? "PASS" : "FAIL"}  fr: displayed title has NBSP typography, hash is over the raw title`);

console.log(`failures=${failures}`);
process.exit(failures ? 1 : 0);
