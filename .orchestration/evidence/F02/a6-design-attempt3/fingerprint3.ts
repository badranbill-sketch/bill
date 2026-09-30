// A6 design attempt 3: re-check approval-scopes.md §3 claims against the real lib/articles.ts
// (codex 66cce52 worktree, read-only). Builds fictional article text in memory only.
import { parseArticle, contentFingerprint, articleSchema } from "/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/base01-codex/lib/articles.ts";
const body = Array.from({ length: 240 }, (_, i) => `mot${i}`).join(" ") + "\n";
const fm: Record<string, unknown> = {
  language: "en", translationGroup: "fixture-group", slug: "fixture-slug",
  title: "A fictional article title", description: "A fictional description long enough.",
  topic: "retirement",
  sources: [{ title: "Source A", url: "https://example.com/a", accessed: "2026-09-30" }],
  author: "Fixture Author", reviewer: null, status: "draft",
  publicationDate: null, substantiveReviewDate: null, nextReviewDate: null,
  relatedServices: ["retirement", "investments"], relatedArticles: [],
  generation: "human", firmApprovalRequired: true,
};
const file = (o: unknown, ind = 2) => `---\n${JSON.stringify(o, null, ind)}\n---\n${body}`;
const h = (o: unknown, ind = 2) => parseArticle(file(o, ind), "x.md").hash;
const base = h(fm);
const rev = Object.fromEntries(Object.entries(fm).reverse());
const srcReordered = { ...fm, sources: [{ accessed: "2026-09-30", url: "https://example.com/a", title: "Source A" }] };
const results: [string, boolean, boolean][] = [];
const chk = (name: string, same: boolean, expectSame: boolean) => { results.push([name, same, expectSame]); console.log(`${same === expectSame ? "AS-CLAIMED" : "CONTRADICTS"} ${name}: hash ${same ? "unchanged" : "changed"}`); };
chk("top-level key order reversed", h(rev) === base, true);
chk("source object key order reversed", h(srcReordered) === base, true);
chk("indentation 0 vs 2", h(fm, 0) === base, true);
chk("status/reviewer/dates set (excluded fields)", h({ ...fm, status: "published", reviewer: "R", publicationDate: "2026-10-01", substantiveReviewDate: "2026-10-01", nextReviewDate: "2027-10-01" }) === base, true);
chk("relatedServices order swapped", h({ ...fm, relatedServices: ["investments", "retirement"] }) === base, false);
chk("URL letter case changed", h({ ...fm, sources: [{ title: "Source A", url: "https://example.com/A", accessed: "2026-09-30" }] }) === base, false);
chk("unknown key inside a source object (stripped)", h({ ...fm, sources: [{ ...(fm.sources as object[])[0], extra: "x" }] }) === base, true);
let threw = false; try { h({ ...fm, extra: 1 }); } catch { threw = true; }
console.log(`${threw ? "AS-CLAIMED" : "CONTRADICTS"} unknown top-level key: parseArticle ${threw ? "throws" : "accepts"}`);
const parsed = articleSchema.parse(rev);
console.log("parsed key order:", Object.keys(parsed).join(","));
console.log("fingerprint equals sha256(JSON.stringify({...substance, body})) in schema order:", contentFingerprint(parsed, body) === base);
console.log("summary:", results.filter(([, s, e]) => s === e).length + (threw ? 1 : 0), "of", results.length + 1, "as claimed");
