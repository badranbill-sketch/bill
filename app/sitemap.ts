import type { MetadataRoute } from "next";
import { business, launchApproved, type Language } from "@/lib/business";
import { routes, pathFor, type PageKey } from "@/lib/routes";
import { articles, approvedArticle, articlePath } from "@/lib/articles";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!launchApproved()) return [];
  const pages = (["fr", "en"] as Language[]).flatMap((lang) =>
    (Object.keys(routes) as PageKey[]).map((key) => ({
      url: business.domain + pathFor(lang, key),
      alternates: {
        languages: {
          "fr-CA": business.domain + pathFor("fr", key),
          "en-CA": business.domain + pathFor("en", key),
        },
      },
    })),
  );
  return [
    ...pages,
    ...articles()
      .filter(approvedArticle)
      .map((a) => ({
        url: business.domain + articlePath(a),
        lastModified: a.substantiveReviewDate!,
        alternates: {
          languages: Object.fromEntries(
            articles()
              .filter(
                (b) =>
                  b.translationGroup === a.translationGroup &&
                  approvedArticle(b),
              )
              .map((b) => [
                `${b.language}-CA`,
                business.domain + articlePath(b),
              ]),
          ),
        },
      })),
  ];
}
