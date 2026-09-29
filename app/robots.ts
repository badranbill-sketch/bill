import type { MetadataRoute } from "next";
import { business, launchApproved } from "@/lib/business";
export default function robots(): MetadataRoute.Robots {
  return launchApproved()
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: ["/fr/revision/", "/en/revision/", "/api/"],
        },
        sitemap: business.domain + "/sitemap.xml",
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
