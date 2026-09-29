import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Language } from "./business";
import { routes } from "./routes";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
export const articleSchema = z
  .object({
    language: z.enum(["fr", "en"]),
    translationGroup: z.string().regex(/^[a-z0-9-]+$/),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(10),
    description: z.string().min(20),
    topic: z.enum(["retirement", "investments"]),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.url().refine((v) => v.startsWith("https://")),
          accessed: date,
        }),
      )
      .min(1),
    author: z.string().nullable(),
    reviewer: z.string().nullable(),
    status: z.enum(["draft", "published"]),
    publicationDate: date,
    substantiveReviewDate: date,
    nextReviewDate: date,
    relatedServices: z.array(z.enum(["retirement", "investments"])),
    relatedArticles: z.array(z.string()),
    generation: z.enum(["ai-assisted", "human"]),
    firmApprovalRequired: z.boolean(),
  })
  .strict();
export type Article = z.infer<typeof articleSchema> & {
  body: string;
  filename: string;
  hash: string;
};
export function contentFingerprint(
  data: z.infer<typeof articleSchema>,
  body: string,
) {
  const {
    status,
    reviewer,
    publicationDate,
    substantiveReviewDate,
    nextReviewDate,
    ...substance
  } = data;
  void [
    status,
    reviewer,
    publicationDate,
    substantiveReviewDate,
    nextReviewDate,
  ];
  return createHash("sha256")
    .update(JSON.stringify({ ...substance, body }))
    .digest("hex");
}
export function parseArticle(raw: string, filename: string): Article {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw Error(`Invalid frontmatter: ${filename}`);
  const data = articleSchema.parse(JSON.parse(match[1]));
  if (match[2].trim().split(/\s+/).length < 220)
    throw Error(`Article too short: ${filename}`);
  if (/<\/?(?:script|iframe)|javascript:/i.test(match[2]))
    throw Error(`Unsafe content: ${filename}`);
  // French spacing is applied for display only, so the approved fingerprint
  // stays that of the file as written.
  const typo = (text: string) =>
    data.language === "fr"
      ? text.replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0")
      : text;
  return {
    ...data,
    title: typo(data.title),
    description: typo(data.description),
    body: typo(match[2]),
    filename,
    hash: contentFingerprint(data, match[2]),
  };
}
export function articles() {
  return fs
    .readdirSync(path.join(process.cwd(), "content"))
    .filter((f) => f.endsWith(".md"))
    .map((f) =>
      parseArticle(
        fs.readFileSync(path.join(process.cwd(), "content", f), "utf8"),
        f,
      ),
    );
}
export type Approval = {
  sha256: string;
  pullRequest: string;
  humanReview: string;
  firmApproval: string | null;
};
export function approvals(): Record<string, Approval> {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "content/approvals.json"), "utf8"),
  );
}
export function approvedArticle(a: Article) {
  const evidence = approvals()[a.filename];
  return (
    a.status === "published" &&
    !!a.author &&
    !!a.reviewer &&
    !!a.publicationDate &&
    !!a.substantiveReviewDate &&
    !!a.nextReviewDate &&
    !!evidence &&
    evidence.sha256 === a.hash &&
    /^https:\/\/github.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(
      evidence.pullRequest,
    ) &&
    !!evidence.humanReview &&
    (!a.firmApprovalRequired || !!evidence.firmApproval)
  );
}
export function visibleArticles(lang: Language, review = false) {
  return articles().filter(
    (a) => a.language === lang && (review || approvedArticle(a)),
  );
}
export const articlePath = (a: Article, review = false) =>
  `/${a.language}/${review ? "revision" : routes.resources[a.language]}/${a.slug}`;
