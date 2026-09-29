import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import {
  business,
  launchApproved,
  reviewEnabled,
  type Language,
} from "@/lib/business";
import { routes, keyFor, pathFor, other } from "@/lib/routes";
import {
  articles,
  approvedArticle,
  articlePath,
  type Article,
} from "@/lib/articles";
import { guide, pages } from "@/lib/pages";
import { t } from "@/lib/copy";
import { Header, Footer, MeetingLink } from "@/components/shell";
import { Home, StandardPage, PageHero } from "@/components/pages";
type Params = { lang: string; slug?: string[] };
export const dynamic = "force-dynamic";
function resolve(p: Params) {
  if (p.lang !== "fr" && p.lang !== "en") notFound();
  const lang = p.lang as Language,
    slug = p.slug?.join("/") || "",
    key = keyFor(lang, slug);
  if (key) return { lang, key, article: null, preview: false };
  const parts = p.slug || [];
  const preview = parts[0] === "revision";
  if (
    parts.length !== 2 ||
    (!preview && parts[0] !== routes.resources[lang]) ||
    (preview && !reviewEnabled())
  )
    notFound();
  const article = articles().find(
    (a) =>
      a.language === lang &&
      a.slug === parts[1] &&
      (preview || approvedArticle(a)),
  );
  if (!article) notFound();
  return { lang, key: null, article, preview };
}
function equivalent(a: Article, preview: boolean) {
  const match = articles().find(
    (x) =>
      x.language === other(a.language) &&
      x.translationGroup === a.translationGroup &&
      (preview || approvedArticle(x)),
  );
  return match
    ? articlePath(match, preview)
    : pathFor(other(a.language), "resources");
}
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const r = resolve(await params),
    c = t(r.lang);
  const title =
    r.article?.title ||
    (r.key === "home"
      ? `${business.name} | ${c.eyebrow}`
      : r.key === "resources"
        ? guide[r.lang].seoTitle
        : r.key === "fees"
          ? c.feesTitle
          : (pages[r.lang][r.key as keyof typeof pages.fr].seoTitle ??
            pages[r.lang][r.key as keyof typeof pages.fr].title));
  const description =
    r.article?.description ||
    (r.key === "home"
      ? c.intro
      : r.key === "resources"
        ? guide[r.lang].description
        : r.key === "fees"
          ? c.feesDesc
          : pages[r.lang][r.key as keyof typeof pages.fr].description);
  const route = r.article
    ? articlePath(r.article, r.preview)
    : pathFor(r.lang, r.key!);
  const alternate = r.article
    ? equivalent(r.article, r.preview)
    : pathFor(other(r.lang), r.key!);
  const publicPage = launchApproved() && !r.preview;
  const hasEquivalent =
    !r.article ||
    articles().some(
      (a) =>
        a.translationGroup === r.article!.translationGroup &&
        a.language === other(r.lang) &&
        approvedArticle(a),
    );
  return {
    metadataBase: new URL(business.domain),
    title: r.key === "home" ? title : `${title} | Bill Badran`,
    description,
    alternates: {
      canonical: route,
      ...(publicPage && hasEquivalent
        ? {
            languages: {
              [`${r.lang}-CA`]: route,
              [`${other(r.lang)}-CA`]: alternate,
            },
          }
        : {}),
    },
    robots: { index: publicPage, follow: publicPage },
    openGraph: {
      title,
      description,
      url: route,
      locale: r.lang === "fr" ? "fr_CA" : "en_CA",
      type: r.article && !r.preview ? "article" : "website",
      images: [
        { url: business.portrait, width: 960, height: 960, alt: "Bill Badran" },
      ],
    },
    icons: { icon: "/assets/monogram.svg" },
  };
}
export default async function Page({ params }: { params: Promise<Params> }) {
  const { lang, key, article, preview } = resolve(await params);
  const alt = article
    ? equivalent(article, preview)
    : pathFor(other(lang), key!);
  const review = reviewEnabled() && !launchApproved();
  const c = t(lang);
  const schema =
    launchApproved() && !preview
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              "@id": `${business.domain}/#bill`,
              name: business.name,
              url: business.domain + pathFor(lang, "about"),
              image: business.domain + business.portrait,
              knowsLanguage: ["fr-CA", "en-CA"],
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: c.home,
                  item: business.domain + pathFor(lang, "home"),
                },
                ...(key === "home"
                  ? []
                  : [
                      {
                        "@type": "ListItem",
                        position: 2,
                        name: article?.title || key,
                        item:
                          business.domain +
                          (article
                            ? articlePath(article)
                            : pathFor(lang, key!)),
                      },
                    ]),
              ],
            },
            ...(article
              ? [
                  {
                    "@type": "Article",
                    headline: article.title,
                    description: article.description,
                    author: { "@type": "Person", name: article.author },
                    reviewedBy: { "@type": "Person", name: article.reviewer },
                    datePublished: article.publicationDate,
                    dateModified: article.substantiveReviewDate,
                    mainEntityOfPage: business.domain + articlePath(article),
                  },
                ]
              : []),
          ],
        }
      : null;
  return (
    <>
      <Header lang={lang} equivalent={alt} />
      <main id="main">
        {article ? (
          <>
            <PageHero
              lang={lang}
              title={article.title}
              description={article.description}
            />
            <section className="section white">
              <div className="wrap content-layout">
                <article className="article-body">
                  {preview && (
                    <div className="review-label">
                      {lang === "fr"
                        ? "Brouillon généré avec assistance IA — non approuvé par Bill. Révision humaine et approbation du cabinet requises avant publication."
                        : "AI-assisted draft — not approved by Bill. Human review and firm approval required before publication."}
                    </div>
                  )}
                  <div className="article-meta">
                    {article.author ||
                      (lang === "fr"
                        ? "Auteur final non désigné"
                        : "Final author not assigned")}{" "}
                    ·{" "}
                    {article.reviewer
                      ? `${lang === "fr" ? "Révision\u00a0:" : "Reviewed by:"} ${article.reviewer}`
                      : lang === "fr"
                        ? "Aucune révision professionnelle effectuée"
                        : "No professional review completed"}
                  </div>
                  <div className="prose">
                    <Markdown skipHtml>{article.body}</Markdown>
                  </div>
                  <h2 style={{ marginTop: 35, fontSize: 28 }}>
                    {lang === "fr" ? "Sources consultées" : "Sources consulted"}
                  </h2>
                  <ul className="sources">
                    {article.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url}>{s.title}</a> — {s.accessed}
                      </li>
                    ))}
                  </ul>
                  <p className="form-hint">{c.disclaimer}</p>
                  <Link className="text-link" href={pathFor(lang, "resources")}>
                    ← {c.back}
                  </Link>
                </article>
                <aside className="aside">
                  <h2>{c.asideTitle}</h2>
                  <p>{c.asideBody}</p>
                  {article.relatedServices.map((k) => (
                    <p key={k}>
                      <Link href={pathFor(lang, k)}>
                        {c.nav[k === "retirement" ? 0 : 1]}
                      </Link>
                    </p>
                  ))}
                  <MeetingLink lang={lang} />
                </aside>
              </div>
            </section>
          </>
        ) : key === "home" ? (
          <Home lang={lang} review={review} />
        ) : (
          <StandardPage lang={lang} page={key!} review={review} />
        )}
      </main>
      <Footer lang={lang} />
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </>
  );
}
