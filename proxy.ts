import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { launchApproved, localReview, reviewEnabled } from "./lib/business";
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const draft = /^\/(fr|en)\/revision(?:\/|$)/.test(path);
  const headers = {
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "private, no-store",
  };
  if (draft && !reviewEnabled())
    return new NextResponse("Not found", { status: 404, headers });
  const needsAuth =
    (draft && !localReview()) || (!launchApproved() && !localReview());
  if (needsAuth) {
    const user = process.env.REVIEW_USER,
      pass = process.env.REVIEW_PASSWORD;
    if (!user || !pass)
      return new NextResponse("Review access is not configured.", {
        status: 503,
        headers,
      });
    const expected =
      "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
    if (!equal(request.headers.get("authorization") || "", expected))
      return new NextResponse("Protected review", {
        status: 401,
        headers: {
          ...headers,
          "WWW-Authenticate":
            'Basic realm="Bill Badran review", charset="UTF-8"',
        },
      });
  }
  const response = NextResponse.next();
  if (!launchApproved() || draft)
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|assets/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
