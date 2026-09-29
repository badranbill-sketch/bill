import { readFile } from "node:fs/promises";
import path from "node:path";
import { launchApproved, reviewEnabled } from "@/lib/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Review-only PDF. The normal site proxy also enforces review authentication. */
export async function GET() {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
  if (launchApproved() || !reviewEnabled())
    return new Response("Not found", { status: 404, headers });
  try {
    const data = await readFile(
      path.join(process.cwd(), "content/guides/retirement-review-en.pdf"),
    );
    return new Response(new Uint8Array(data), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'inline; filename="bill-badran-retirement-guide-review.pdf"',
        "Content-Length": String(data.byteLength),
      },
    });
  } catch {
    return new Response("Guide temporarily unavailable", {
      status: 503,
      headers,
    });
  }
}
