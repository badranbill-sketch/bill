import { execFileSync } from "node:child_process";
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !/^[-\w.]+\/[-\w.]+$/.test(repo))
  throw Error("Set GITHUB_REPOSITORY=owner/repo and authenticate gh.");
const api = (p: string) =>
  JSON.parse(execFileSync("gh", ["api", p], { encoding: "utf8" }));
const branch = api(`repos/${repo}`).default_branch;
const protection = api(`repos/${repo}/branches/${branch}/protection`);
const reviews = protection.required_pull_request_reviews;
if (
  !reviews ||
  reviews.required_approving_review_count < 1 ||
  !reviews.dismiss_stale_reviews ||
  !reviews.require_code_owner_reviews ||
  !reviews.require_last_push_approval ||
  !protection.enforce_admins?.enabled
)
  throw Error(
    "Require at least one approving review, stale review dismissal, CODEOWNER review, last-push approval and enforcement for admins.",
  );
if (
  !protection.required_status_checks?.strict ||
  !protection.required_status_checks.contexts?.includes("verify")
)
  throw Error("Require up-to-date branches and verify status check.");
console.log(
  "Required branch protection settings verified. Confirm no ruleset bypasses and actual Bill/firm review identities separately.",
);
