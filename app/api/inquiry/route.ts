import { NextRequest, NextResponse } from "next/server";
import { submitInquiry } from "@/lib/contact";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const respond = (status: number, code: string) =>
    NextResponse.json(
      { code },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          ...(status === 429 ? { "Retry-After": "600" } : {}),
        },
      },
    );
  const origin = request.headers.get("origin");
  try {
    if (
      !origin ||
      new URL(origin).host !== request.headers.get("host") ||
      !["http:", "https:"].includes(new URL(origin).protocol)
    )
      return respond(403, "origin");
  } catch {
    return respond(403, "origin");
  }
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return respond(415, "content_type");
  const reader = request.body?.getReader();
  if (!reader) return respond(400, "validation");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12000) {
        await reader.cancel();
        return respond(413, "too_large");
      }
      chunks.push(value);
    }
    const raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const ip = process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for")
      : process.env.TRUST_PROXY_IP === "true"
        ? request.headers.get("x-forwarded-for")
        : null;
    const result = await submitInquiry(
      raw,
      ip?.split(",")[0]?.trim() || "unknown",
    );
    return respond(result.status, result.code);
  } catch {
    return respond(400, "validation");
  }
}
