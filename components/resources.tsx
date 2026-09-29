import Link from "next/link";
import { business, type Language } from "@/lib/business";
import { visibleArticles, articlePath, approvedArticle } from "@/lib/articles";
import { pathFor } from "@/lib/routes";
import { t } from "@/lib/copy";
export function Resources({
  lang,
  review = false,
  list = false,
}: {
  lang: Language;
  review?: boolean;
  /** A short ruled list (homepage) instead of the full grid. */
  list?: boolean;
}) {
  const c = t(lang);
  const guide = business.guides[lang];
  if (list)
    return (
      <ul className="resource-list">
        {visibleArticles(lang, review).map((a) => (
          <li key={a.slug}>
            {!approvedArticle(a) && <p className="kind">{c.draft}</p>}
            <h3>
              <Link href={articlePath(a, !approvedArticle(a))}>{a.title}</Link>
            </h3>
            <p>{a.description}</p>
          </li>
        ))}
        <li>
          <p className="kind">{c.tool}</p>
          <h3>
            <Link href={pathFor(lang, "fees")}>{c.feesTitle}</Link>
          </h3>
          <p>{c.feesDesc}</p>
        </li>
      </ul>
    );
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
      {guide?.approved && (
        <article className="resource">
          <h3>
            {lang === "fr" ? "Guide à télécharger" : "Download the guide"}
          </h3>
          <a className="text-link" href={guide.path} download>
            {lang === "fr" ? "Télécharger le PDF" : "Download PDF"}
          </a>
        </article>
      )}
    </div>
  );
}
