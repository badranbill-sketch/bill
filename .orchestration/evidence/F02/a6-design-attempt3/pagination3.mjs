// A6 attempt 3: replay of verify-publication.ts lines 23-43 (codex blob 393d8d6) on a fictional
// review list of 101 reviews. GitHub returns reviews oldest first; per_page=100 gives the first 100.
const head = "h".repeat(40), url = "https://github.com/o/r/pull/1#pullrequestreview-50";
const all = Array.from({ length: 101 }, (_, i) => ({ user: { login: i === 50 || i === 100 ? "bill" : "bot" + i }, state: "COMMENTED", commit_id: head, html_url: "u" + i }));
all[50] = { user: { login: "bill" }, state: "APPROVED", commit_id: head, html_url: url };
all[100] = { user: { login: "bill" }, state: "CHANGES_REQUESTED", commit_id: head, html_url: "later" };
const run = (reviewList) => { const latest = new Map(); for (const r of reviewList) latest.set(r.user.login, r);
  const r = latest.get("bill"); return r?.state === "APPROVED" && r.commit_id === head && r.html_url === url; };
console.log("first page only (script behaviour): passes =", run(all.slice(0, 100)));
console.log("all 101 reviews (true latest state):  passes =", run(all));
console.log("=> approval-scopes.md s3 'fails closed' is contradicted when the later CHANGES_REQUESTED is beyond review 100");
