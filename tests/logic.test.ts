import { test } from "node:test";
import assert from "node:assert/strict";
import { compareFees } from "../lib/fees";
import { discussionTopics } from "../lib/checklist";
import { pathFor, keyFor, routes, type PageKey } from "../lib/routes";
import { articles, approvedArticle, parseArticle } from "../lib/articles";
import {
  submitInquiry,
  escapeHtml,
  type ContactEnvironment,
} from "../lib/contact";
const env: ContactEnvironment = {
  ENABLE_CONTACT: "true",
  RESEND_API_KEY: "fake",
  MAIL_FROM: "test@example.invalid",
  UPSTASH_REDIS_REST_URL: "https://rate.invalid",
  UPSTASH_REDIS_REST_TOKEN: "fake",
  RATE_LIMIT_SALT: "unit-test-only",
  TRUST_PROXY_IP: "true",
};
const inquiry = {
  name: "Test <script>",
  email: "test@example.invalid",
  topic: "retirement",
  message: "Test & only",
  language: "en",
  website: "",
  requestId: "d5647485-a416-4a9c-a2d2-5cf23301b8cb",
};
const mock = (
  response: number | Error = 200,
  count = 1,
  id: unknown = "test-id",
) => {
  const requests: RequestInit[] = [];
  const fn = (async (_url: unknown, init: RequestInit) => {
    requests.push(init);
    if (requests.length % 2 === 1) return Response.json({ result: count });
    if (response instanceof Error) throw response;
    return Response.json({ id }, { status: response });
  }) as typeof fetch;
  return { fn, requests };
};
test("fee comparison against independent iterative expectations", () => {
  for (const [p, y, g] of [
    [100000, 25, 1],
    [0, 0, 0],
    [100, 1, 1],
    [10000000, 50, 5],
    [999, 30, 0],
  ]) {
    let a = p,
      b = p;
    for (let n = 0; n < y; n++) {
      a += a * 0.05;
      b += b * (0.05 - g / 100);
    }
    const r = compareFees(p, y, g);
    assert.ok(Math.abs(r.base - a) < 0.0001);
    assert.ok(Math.abs(r.extra - b) < 0.0001);
    assert.ok(Math.abs(r.difference - (a - b)) < 0.0001);
  }
  assert.equal(compareFees(100, 1, 1).difference, 1);
});
test("fee invalid and boundary inputs", () => {
  for (const vals of [
    [NaN, 2, 1],
    [-1, 2, 1],
    [Infinity, 2, 1],
    [10000001, 1, 1],
    [100, 1.5, 1],
    [100, 51, 1],
    [100, -1, 1],
    [100, 2, -1],
    [100, 2, 6],
  ])
    assert.throws(
      () => compareFees(...(vals as [number, number, number])),
      RangeError,
    );
});
test("checklist distinguishes unanswered, yes and discussion topics", () => {
  assert.deepEqual(discussionTopics([null, null, null, null, null], "en"), []);
  assert.equal(
    discussionTopics(["yes", "no", "unsure", null, "yes"], "en").length,
    2,
  );
  assert.deepEqual(
    discussionTopics(["yes", "yes", "yes", "yes", "yes"], "fr"),
    [],
  );
});
test("all localized routes map both ways", () => {
  for (const key of Object.keys(routes) as PageKey[])
    for (const lang of ["fr", "en"] as const)
      assert.equal(
        keyFor(lang, pathFor(lang, key).split("/").slice(2).join("/")),
        key,
      );
});
test("draft fixtures pair and are never publishable", () => {
  const all = articles();
  assert.equal(all.length, 4);
  assert.ok(all.every((a) => !approvedArticle(a)));
  for (const a of all)
    assert.ok(
      all.some(
        (b) =>
          b.language !== a.language &&
          b.translationGroup === a.translationGroup,
      ),
    );
});
test("unsafe or incomplete article import is rejected", () => {
  assert.throws(() =>
    parseArticle("---\n{}\n---\n<script>alert(1)</script>", "bad.md"),
  );
});
test("missing credentials and validation fail honestly", async () => {
  assert.equal((await submitInquiry(inquiry, "test", {})).status, 503);
  for (const bad of [
    { ...inquiry, email: "invalid" },
    { ...inquiry, message: "x".repeat(2001) },
    { ...inquiry, website: "bot" },
    { ...inquiry, answers: [1] },
  ])
    assert.equal((await submitInquiry(bad, "test", env)).status, 400);
});
test("provider acceptance and safe escaping; deterministic idempotency", async () => {
  const a = mock(),
    b = mock();
  assert.equal((await submitInquiry(inquiry, "test", env, a.fn)).status, 202);
  await submitInquiry(inquiry, "test", env, b.fn);
  assert.deepEqual(a.requests[1].headers, b.requests[1].headers);
  const payload = JSON.parse(a.requests[1].body as string);
  assert.ok(payload.html.includes("&lt;script&gt;"));
  assert.equal(escapeHtml("<>&\"'"), "&lt;&gt;&amp;&quot;&#39;");
  assert.ok(!(a.requests[0].body as string).includes(inquiry.message));
});
test("rate limit prevents mail; provider error, malformed acceptance, exception and timeout never succeed", async () => {
  const limit = mock(200, 6);
  assert.equal(
    (await submitInquiry(inquiry, "test", env, limit.fn)).status,
    429,
  );
  assert.equal(limit.requests.length, 1);
  for (const code of [400, 429, 500])
    assert.equal(
      (await submitInquiry(inquiry, "test", env, mock(code).fn)).status,
      502,
    );
  assert.equal(
    (await submitInquiry(inquiry, "test", env, mock(200, 1, null).fn)).status,
    502,
  );
  assert.equal(
    (await submitInquiry(inquiry, "test", env, mock(new Error("network")).fn))
      .status,
    503,
  );
  const e = new Error("timeout");
  e.name = "TimeoutError";
  assert.equal(
    (await submitInquiry(inquiry, "test", env, mock(e).fn)).code,
    "timeout",
  );
});
test("rate store HTTP errors and malformed JSON fail closed", async () => {
  for (const response of [
    new Response("", { status: 500 }),
    Response.json({ error: "x" }),
    new Response("not JSON"),
  ]) {
    assert.equal(
      (
        await submitInquiry(
          inquiry,
          "test",
          env,
          (async () => response) as typeof fetch,
        )
      ).status,
      503,
    );
  }
});
test("content fingerprint binds substantive changes, not review metadata", async () => {
  const { contentFingerprint } = await import("../lib/articles");
  const a = articles()[0];
  assert.equal(
    contentFingerprint(a, a.body),
    contentFingerprint(
      {
        ...a,
        status: "published",
        reviewer: "Human",
        publicationDate: "2026-09-28",
      },
      a.body,
    ),
  );
  assert.notEqual(
    contentFingerprint(a, a.body),
    contentFingerprint({ ...a, title: a.title + " edited" }, a.body),
  );
  assert.notEqual(
    contentFingerprint(a, a.body),
    contentFingerprint({ ...a, author: "Changed" }, a.body),
  );
  assert.notEqual(
    contentFingerprint(a, a.body),
    contentFingerprint(a, a.body + " New claim."),
  );
});
