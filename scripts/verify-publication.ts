import { execFileSync } from "node:child_process";
import {
  articles,
  approvedArticle,
  approvals,
  parseArticle,
} from "../lib/articles";
const repo = process.env.GITHUB_REPOSITORY;
const api = (p: string) =>
  JSON.parse(execFileSync("gh", ["api", p], { encoding: "utf8" }));
for (const a of articles().filter((a) => a.status === "published")) {
  if (!approvedArticle(a))
    throw Error("Missing hash-bound evidence: " + a.filename);
  const evidence = approvals()[a.filename];
  const match = evidence.pullRequest.match(
    /^https:\/\/github.com\/([^/]+\/[^/]+)\/pull\/(\d+)$/,
  )!;
  if (match[1] !== repo)
    throw Error("Review PR must belong to this repository.");
  const pr = api(`repos/${repo}/pulls/${match[2]}`);
  if (!pr.merged_at)
    throw Error("Review PR must be merged before publication.");
  const reviewList = api(
    `repos/${repo}/pulls/${match[2]}/reviews?per_page=100`,
  );
  const reviewers = (process.env.CONTENT_REVIEWERS || "")
      .split(",")
      .filter(Boolean),
    firm = (process.env.FIRM_REVIEWERS || "").split(",").filter(Boolean);
  const latest = new Map<
    string,
    { state: string; commit_id: string; html_url: string }
  >();
  for (const r of reviewList) latest.set(r.user.login, r);
  const has = (users: string[], url: string | null) =>
    users.some((u) => {
      const r = latest.get(u);
      return (
        r?.state === "APPROVED" &&
        r.commit_id === pr.head.sha &&
        r.html_url === url
      );
    });
  if (!has(reviewers, evidence.humanReview))
    throw Error(
      "Missing current-head approval by a configured human content reviewer.",
    );
  if (a.firmApprovalRequired && !has(firm, evidence.firmApproval))
    throw Error("Missing current-head firm review.");
  const source = api(
    `repos/${repo}/contents/content/${a.filename}?ref=${pr.head.sha}`,
  );
  const reviewRaw = Buffer.from(
    source.content.replace(/\n/g, ""),
    "base64",
  ).toString();
  if (parseArticle(reviewRaw, a.filename).hash !== a.hash)
    throw Error(
      "Published bytes differ from human-reviewed bytes: " + a.filename,
    );
  console.log("Verified publication approval: " + a.filename);
}
