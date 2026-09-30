// A6: does reordering frontmatter keys change contentFingerprint? Uses the real lib/articles.ts (codex 66cce52, blob df24ccb1).
import { parseArticle } from "/tmp/claude-0/-home-user/bb8d4187-6ae8-587b-a816-8153faeea853/scratchpad/wt/base01-codex/lib/articles.ts";
const fm = {
  language: "en", translationGroup: "fixture-order", slug: "fixture-order",
  title: "Fictional fixture article title", description: "A fictional description used only for this test.",
  topic: "retirement", sources: [{ title: "Fixture source", url: "https://example.com/source", accessed: "2026-09-30" }],
  author: null, reviewer: null, status: "draft", publicationDate: null, substantiveReviewDate: null, nextReviewDate: null,
  relatedServices: ["retirement"], relatedArticles: [], generation: "human", firmApprovalRequired: true,
};
const body = Array.from({ length: 240 }, (_, i) => "word" + i).join(" ") + "\n";
const reversed = Object.fromEntries(Object.entries(fm).reverse());
const srcReordered = { ...fm, sources: [{ accessed: "2026-09-30", url: "https://example.com/source", title: "Fixture source" }] };
const a = parseArticle(`---\n${JSON.stringify(fm, null, 2)}\n---\n${body}`, "a.md");
const b = parseArticle(`---\n${JSON.stringify(reversed, null, 2)}\n---\n${body}`, "b.md");
const c = parseArticle(`---\n${JSON.stringify(srcReordered, null, 2)}\n---\n${body}`, "c.md");
const d = parseArticle(`---\n${JSON.stringify({ ...fm, title: "Fictional fixture article title!" }, null, 2)}\n---\n${body}`, "d.md");
console.log("file-order keys        :", a.hash);
console.log("reversed top-level keys:", b.hash, a.hash === b.hash ? "(SAME hash)" : "(different hash)");
console.log("reordered source keys  :", c.hash, a.hash === c.hash ? "(SAME hash)" : "(different hash)");
console.log("title changed (control):", d.hash, a.hash === d.hash ? "(SAME hash)" : "(different hash)");
