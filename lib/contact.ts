import { z } from "zod";
import { createHmac } from "node:crypto";
import { business } from "./business";
export const inquirySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(254),
    topic: z.enum(["retirement", "investments", "income", "other"]),
    message: z.string().trim().min(1).max(2000),
    language: z.enum(["fr", "en"]),
    website: z.string().max(0),
    requestId: z.uuid(),
  })
  .strict();
export type Inquiry = z.infer<typeof inquirySchema>;
export type ContactEnvironment = Record<string, string | undefined>;
export function contactConfigured(env: ContactEnvironment = process.env) {
  return !!(
    env.ENABLE_CONTACT === "true" &&
    env.RESEND_API_KEY &&
    env.MAIL_FROM &&
    env.UPSTASH_REDIS_REST_URL &&
    env.UPSTASH_REDIS_REST_TOKEN &&
    env.RATE_LIMIT_SALT &&
    (env.VERCEL || env.TRUST_PROXY_IP === "true")
  );
}
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function submitInquiry(
  raw: unknown,
  ip: string,
  env: ContactEnvironment = process.env,
  fetcher: typeof fetch = fetch,
) {
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) return { status: 400, code: "validation" };
  if (!contactConfigured(env)) return { status: 503, code: "unavailable" };
  const data = parsed.data;
  const key =
    "inquiry:" +
    createHmac("sha256", env.RATE_LIMIT_SALT!).update(ip).digest("hex");
  try {
    const rate = await fetcher(env.UPSTASH_REDIS_REST_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],600) end; return n",
        "1",
        key,
      ]),
      signal: AbortSignal.timeout(5000),
    });
    if (!rate.ok) return { status: 503, code: "unavailable" };
    const count = await rate.json();
    if (typeof count.result !== "number")
      return { status: 503, code: "unavailable" };
    if (count.result > 5) return { status: 429, code: "rate_limited" };
    const idempotency = createHmac("sha256", env.RATE_LIMIT_SALT!)
      .update(JSON.stringify(data))
      .digest("hex");
    const result = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `inquiry-${idempotency}`,
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [business.email],
        reply_to: data.email,
        subject: `Website inquiry — ${data.topic}`,
        text: `Name: ${data.name}\nEmail: ${data.email}\nLanguage: ${data.language}\nTopic: ${data.topic}\n\n${data.message}`,
        html: `<p>Name: ${escapeHtml(data.name)}<br>Email: ${escapeHtml(data.email)}<br>Language: ${data.language}<br>Topic: ${data.topic}</p><p>${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) return { status: 502, code: "provider_error" };
    const sent = await result.json();
    if (typeof sent.id !== "string" || !sent.id)
      return { status: 502, code: "provider_error" };
    return { status: 202, code: "accepted" };
  } catch (error) {
    return {
      status: 503,
      code:
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
          ? "timeout"
          : "unavailable",
    };
  }
}
