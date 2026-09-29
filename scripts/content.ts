import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import { articles, approvedArticle, parseArticle } from "../lib/articles";
const args = process.argv.slice(2),
  command = args[0];
const value = (key: string) => {
  const i = args.indexOf(key);
  return i < 0 ? undefined : args[i + 1];
};
function validate() {
  const all = articles();
  const keys = new Set<string>();
  for (const a of all) {
    const key = a.language + "/" + a.slug;
    if (keys.has(key)) throw Error("Duplicate route: " + key);
    keys.add(key);
    if (a.status === "published" && !approvedArticle(a))
      throw Error(
        "Published article lacks current approval evidence: " + a.filename,
      );
    if (
      a.status === "draft" &&
      (a.reviewer || a.publicationDate || a.substantiveReviewDate)
    )
      throw Error("Draft must not claim review or publication: " + a.filename);
    if (
      !all.some(
        (b) =>
          b.translationGroup === a.translationGroup &&
          b.language !== a.language,
      )
    )
      throw Error("Translation missing: " + a.translationGroup);
    for (const rel of a.relatedArticles)
      if (
        !all.some(
          (b) => b.translationGroup === rel && b.language === a.language,
        )
      )
        throw Error("Related article missing: " + rel);
    if (
      a.nextReviewDate &&
      a.nextReviewDate < new Date().toISOString().slice(0, 10)
    )
      console.warn("REVIEW DUE: " + a.filename);
  }
  console.log(
    `Validated ${all.length} articles; ${all.filter(approvedArticle).length} publishable. Drafts excluded from public routes.`,
  );
}
if (command === "validate" || command === "review-due") validate();
else if (command === "import") {
  const briefPath = value("--brief"),
    draftPath = value("--draft"),
    notesPath = value("--notes");
  if (!briefPath || !draftPath || !notesPath)
    throw Error(
      "Use import --brief file.json --draft file.md --notes file.txt [--dry-run]",
    );
  const brief = z
    .object({
      title: z.string(),
      audience: z.string(),
      sources: z.array(z.url()).min(1),
      noClientIdentifyingRecords: z.literal(true),
    })
    .parse(JSON.parse(fs.readFileSync(briefPath, "utf8")));
  const notes = fs.readFileSync(notesPath, "utf8");
  if (notes.length > 100000) throw Error("Notes too large");
  const raw = fs.readFileSync(draftPath, "utf8"),
    draft = parseArticle(raw, path.basename(draftPath));
  if (
    draft.status !== "draft" ||
    draft.reviewer ||
    draft.publicationDate ||
    draft.substantiveReviewDate
  )
    throw Error("Import only unreviewed drafts");
  if (!draft.sources.every((s) => brief.sources.includes(s.url)))
    throw Error("Draft sources must be present in brief");
  const destination = path.join(
    "content",
    `${draft.language}-${draft.slug}.md`,
  );
  if (!args.includes("--dry-run")) {
    if (fs.existsSync(destination))
      throw Error(
        "Will not overwrite existing content; edit on a review branch",
      );
    fs.writeFileSync(destination, raw, { flag: "wx" });
  }
  console.log(
    `${args.includes("--dry-run") ? "Dry run: would import" : "Imported"} ${destination}. Notes read as data only. No model, Git or publishing operation performed.`,
  );
} else if (command === "pr") {
  if (process.env.ALLOW_CONTENT_PR !== "true")
    throw Error(
      "Set ALLOW_CONTENT_PR=true only after authorizing a review pull request.",
    );
  validate();
  const branch = execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
  if (!branch || ["main", "master"].includes(branch))
    throw Error("Create and commit a dedicated review branch first");
  if (
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
  )
    throw Error("Commit the intended draft changes before creating the PR");
  const body =
    "Content review only.\n\nOpen the protected Vercel preview, select Resources, and read each labelled draft in both languages. Bill reviews the readable pages. Arnaud handles merge and publication. No automatic approval or publication.\n\nVerify source claims, translations, service scope, author attribution and firm approval requirements. Material changes require fresh review.\n";
  fs.mkdirSync("work", { recursive: true });
  fs.writeFileSync("work/content-pr.md", body);
  execFileSync(
    "gh",
    [
      "pr",
      "create",
      "--draft",
      "--title",
      "Review bilingual retirement content",
      "--body-file",
      "work/content-pr.md",
    ],
    { stdio: "inherit" },
  );
} else if (command === "generate") {
  throw Error(
    "AI generation is not enabled. Import reviewed-source drafts with the import command. No model receives notes.",
  );
} else
  throw Error(
    "Commands: validate, review-due, import, pr. See docs/CONTENT-WORKFLOW.md.",
  );
