import Link from "next/link";
import type { Language } from "@/lib/business";
import { visibleArticles, articlePath, approvedArticle } from "@/lib/articles";
import { pathFor } from "@/lib/routes";
import { t } from "@/lib/copy";
export function Resources({
  lang,
  review = false,
}: {
  lang: Language;
  review?: boolean;
}) {
  const c = t(lang);
  return (
    <div className="resource-grid">
      {visibleArticles(lang, review).map((a) => (
        <article className="resource" key={a.slug}>
          <span className="eyebrow">
            {!approvedArticle(a)
              ? c.draft
              : lang === "fr"
                ? "Article"
                : "Article"}
          </span>
          <h3>
            <Link href={articlePath(a, !approvedArticle(a))}>{a.title}</Link>
          </h3>
          <p>{a.description}</p>
          <Link
            className="text-link"
            href={articlePath(a, !approvedArticle(a))}
          >
            {!approvedArticle(a)
              ? lang === "fr"
                ? "Lire le brouillon"
                : "Read draft"
              : c.read}{" "}
            →
          </Link>
        </article>
      ))}
      <article className="resource">
        <span className="eyebrow">{c.tool}</span>
        <h3>
          <Link href={pathFor(lang, "fees")}>{c.feesTitle}</Link>
        </h3>
        <p>{c.feesDesc}</p>
        <Link className="text-link" href={pathFor(lang, "fees")}>
          {lang === "fr" ? "Essayer l’illustration" : "Try the illustration"} →
        </Link>
      </article>
    </div>
  );
}
