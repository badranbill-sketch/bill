import Link from "next/link";
import type { ReactNode } from "react";
import { business, type Language } from "@/lib/business";
import { t } from "@/lib/copy";
import { guide, pages } from "@/lib/pages";
import { pathFor, type PageKey } from "@/lib/routes";
import { contactConfigured } from "@/lib/contact";
import { Portrait } from "./portrait";
import { MeetingLink } from "./shell";
import { Checklist } from "./checklist";
import { Inquiry } from "./inquiry";
import { Fees } from "./fees";
import { Resources } from "./resources";
import { Ride } from "./journey/ride";
import { Reveal } from "./reveal";
import { Booklet } from "./booklet";
import {
  AskCards,
  AskList,
  AskOwn,
  GuideContents,
  arrow,
  askMail,
} from "./ask";
import { askGroups } from "@/lib/ask";
import { InkFile } from "./ink/file";

export function Contact({
  lang,
  meeting = true,
}: {
  lang: Language;
  meeting?: boolean;
}) {
  const c = t(lang);
  const form = contactConfigured();
  const info = (
    <dl className="contact-info">
      <div>
        <dt>{c.phone}</dt>
        <dd>
          <a href={`tel:${business.tel}`}>{business.phone}</a>
        </dd>
      </div>
      <div>
        <dt>{c.email}</dt>
        <dd>
          <a href={`mailto:${business.email}`}>{business.email}</a>
        </dd>
      </div>
      <div>
        <dt>{c.office}</dt>
        <dd>
          <address>{business.address[lang]}</address>
        </dd>
      </div>
    </dl>
  );
  return (
    <section className="section ivory" id="contact">
      <div className="wrap contact">
        <div>
          <p className="eyebrow">Contact</p>
          <h2>{c.contactTitle}</h2>
          <p className="intro">{c.contactIntro}</p>
          {meeting && (
            <div>
              <MeetingLink lang={lang} />
            </div>
          )}
          {form && info}
        </div>
        {/* A switched-off form is not shown: phone and email are the way in. */}
        {form ? <Inquiry lang={lang} enabled /> : info}
      </div>
    </section>
  );
}

/** The closing invitation at the bottom of an inner page. */
function Invitation({ lang }: { lang: Language }) {
  const c = t(lang);
  return (
    <section className="section ivory invitation">
      <div className="wrap">
        <h2>{c.asideTitle}</h2>
        <p className="lede">{c.asideBody}</p>
        <MeetingLink lang={lang} />
      </div>
    </section>
  );
}

/**
 * The homepage, as a sequence of pages from Bill's notebook: Bill himself,
 * why he works the way he does, the questions people bring him, his guide,
 * then the first meeting (content, guide, meeting). The mountain ride comes
 * after, as a short epilogue, not in the way. The hero drawing and the ride
 * carry the only motion; everything else is still, apart from drawings
 * appearing once.
 */
export function Home({ lang }: { lang: Language }) {
  const c = t(lang);
  const pdf = business.guide.pdf[lang];
  return (
    <>
      <section className="hero" id="intro">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>
              {sentences(c.hero).map((s) => (
                <span key={s}>{s} </span>
              ))}
              <em>{c.heroAccent}</em>
            </h1>
            <p className="lede">{c.intro}</p>
            <div className="hero-actions">
              <MeetingLink lang={lang} />
              <Link
                className="text-link"
                href={`${pathFor(lang, "meeting")}#deroulement`}
              >
                {c.how}
              </Link>
            </div>
            <p className="hero-who">{c.portrait}</p>
          </div>
          <div className="hero-art">
            <div className="hero-notebook">
              <InkFile name="questions-notebook" lang={lang} priority />
            </div>
            {c.heroNote && <p className="hero-note hand">{c.heroNote}</p>}
            <figure className="hero-print">
              <Portrait
                lang={lang}
                priority
                sizes="(max-width: 600px) 96px, (max-width: 900px) 180px, 26vw"
              />
              <figcaption className="hand">{c.photoCaption}</figcaption>
            </figure>
          </div>
        </div>
      </section>
      <section className="section ivory why" id="pourquoi-bill">
        <div className="wrap">
          <div className="why-aside">
            <p className="eyebrow">{c.why.label}</p>
            <Reveal>
              <InkFile name="letter" lang={lang} />
            </Reveal>
            <p className="hand">{c.why.note}</p>
          </div>
          <div>
            <h2>
              {c.why.title} <em>{c.why.accent}</em>
            </h2>
            <p className="body">{c.why.intro}</p>
            <ul className="why-points">
              {c.why.points.map(([title, body]) => (
                <li key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ul>
            <p className="credibility">
              <strong>{c.experience}</strong>
              <span>{c.experienceSub}</span>
            </p>
            <Link className="text-link" href={pathFor(lang, "about")}>
              {c.why.aboutLink}
            </Link>
          </div>
        </div>
      </section>
      <section className="section" id="demandez-a-bill">
        <div className="wrap spread">
          <div className="spread-aside">
            <p className="eyebrow">{c.ask.label}</p>
            <h2>{c.ask.title}</h2>
            <p className="aside-intro">{c.ask.intro}</p>
            <p className="hand">{c.ask.note}</p>
            <Reveal>
              <InkFile name="lighthouse" lang={lang} />
            </Reveal>
          </div>
          <div>
            <AskCards lang={lang} />
            <div className="ask-actions">
              <Link className="text-link" href={pathFor(lang, "ask")}>
                {c.ask.allLink}
                {arrow}
              </Link>
            </div>
            <AskOwn lang={lang} />
          </div>
        </div>
      </section>
      <section className="section ivory" id="guide">
        <div className="wrap guide-teaser">
          <div className="guide-cover">
            <Reveal>
              <Booklet lang={lang} />
            </Reveal>
          </div>
          <div>
            <p className="eyebrow">{c.booklet.label}</p>
            <h2>{c.booklet.title}</h2>
            <p className="body">{c.booklet.body}</p>
            <p className="contents-label">{c.booklet.contentsLabel}</p>
            <ol className="booklet-contents">
              {askGroups(lang).map((g) => (
                <li key={g.key}>{g.title}</li>
              ))}
            </ol>
            <div className="guide-actions">
              <Link className="text-link" href={pathFor(lang, "resources")}>
                {c.booklet.read}
                {arrow}
              </Link>
              {pdf?.approved && (
                <a className="text-link" href={pdf.path} download>
                  {c.booklet.download}
                </a>
              )}
              {business.guide.printedCopies && (
                <a className="text-link" href={bookletMail(lang)}>
                  {c.booklet.requestCopy}
                </a>
              )}
            </div>
            <p className="bring-it">
              {/* "Bring it along" only once there is something to bring. */}
              {pdf?.approved || business.guide.printedCopies
                ? c.booklet.bringIt
                : c.booklet.bringQuestions}{" "}
              <Link href={pathFor(lang, "meeting")}>
                {c.meeting}
                {arrow}
              </Link>
            </p>
          </div>
        </div>
      </section>
      <section className="open-door">
        <div className="wrap">
          <p>{c.openDoor}</p>
        </div>
      </section>
      <section className="section ivory" id="rencontre">
        <div className="wrap meet">
          <Reveal>
            <InkFile name="two-chairs" lang={lang} />
          </Reveal>
          <div>
            <p className="eyebrow">{c.processLabel}</p>
            <h2>{c.processTitle}</h2>
            <p className="intro">{c.processIntro}</p>
            <ol className="steps">
              {c.steps.map(([title, body], i) => (
                <li key={title}>
                  <span className="number" aria-hidden="true">
                    {i + 1}.
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="meet-actions">
              <MeetingLink lang={lang} />
              <Link className="text-link" href={pathFor(lang, "meeting")}>
                {c.howLink}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Ride lang={lang} />
      <Contact lang={lang} />
    </>
  );
}

/** "You've worked hard. You've saved." → one line per sentence. */
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);

/** An email asking Bill for a printed copy of the guide. */
const bookletMail = (lang: Language) =>
  askMail(lang, t(lang).booklet.coverTitle);

export function PageHero({
  lang,
  title,
  description,
  kicker,
  crumb,
  cta = true,
  art,
  wide = false,
}: {
  lang: Language;
  title: string;
  description: string;
  kicker?: string;
  crumb?: string;
  /** Repeat the one action under the introduction (small screens only). */
  cta?: boolean;
  art?: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={wide ? "page-hero wide-art" : "page-hero"}>
      <div className="wrap">
        <div>
          <nav
            className="breadcrumb"
            aria-label={lang === "fr" ? "Fil d’Ariane" : "Breadcrumb"}
          >
            <Link href={pathFor(lang, "home")}>{t(lang).home}</Link>
            <span aria-hidden="true">/</span>
            <span>{crumb ?? title}</span>
          </nav>
          {kicker && <p className="kicker">{kicker}</p>}
          <h1>{title}</h1>
          <p className="lede">{description}</p>
          {cta && (
            <p className="page-hero-cta">
              <Link className="text-link" href={pathFor(lang, "meeting")}>
                {t(lang).meeting} →
              </Link>
            </p>
          )}
        </div>
        {art && <div className="page-hero-art">{art}</div>}
      </div>
    </section>
  );
}

/** The drawing at the top of each inner page. */
function heroArt(page: Exclude<PageKey, "home">, lang: Language) {
  switch (page) {
    case "retirement":
      return <InkFile name="path" lang={lang} priority />;
    case "investments":
      return <InkFile name="sailboat" lang={lang} priority />;
    case "meeting":
      // The room where you'd sit down, with Bill in it.
      return (
        <div className="meeting-art">
          <InkFile name="two-chairs" lang={lang} priority />
          <figure className="meeting-print">
            <Portrait
              lang={lang}
              priority
              sizes="(max-width: 900px) 110px, 140px"
            />
            <figcaption className="hand">{t(lang).photoCaption}</figcaption>
          </figure>
        </div>
      );
    case "resources":
      return <Booklet lang={lang} priority />;
    case "ask":
      return <InkFile name="desk" lang={lang} priority />;
    default:
      return undefined;
  }
}

export function StandardPage({
  lang,
  page,
  review,
}: {
  lang: Language;
  page: Exclude<PageKey, "home">;
  review: boolean;
}) {
  const c = t(lang);
  const fr = lang === "fr";
  if (page === "resources") {
    const g = guide[lang];
    const pdf = business.guide.pdf[lang];
    return (
      <>
        <PageHero
          lang={lang}
          title={g.title}
          description={g.description}
          crumb={c.nav.guide}
          art={heroArt(page, lang)}
        />
        <section className="section" id="sommaire">
          <div className="wrap guide-page">
            <div className="section-head">
              <h2>{g.contentsTitle}</h2>
              <p>{g.contentsIntro}</p>
            </div>
            <GuideContents lang={lang} />
            <div className="guide-actions">
              <Link className="text-link" href={pathFor(lang, "ask")}>
                {c.ask.allLink}
                {arrow}
              </Link>
              {pdf?.approved && (
                <a className="text-link" href={pdf.path} download>
                  {c.booklet.download}
                </a>
              )}
              {business.guide.printedCopies && (
                <a className="text-link" href={bookletMail(lang)}>
                  {c.booklet.requestCopy}
                </a>
              )}
            </div>
          </div>
        </section>
        <Checklist lang={lang} />
        <section className="section">
          <div className="wrap">
            <h2 style={{ marginBottom: 30 }}>{g.read}</h2>
            <Resources lang={lang} review={review} />
            <h2 style={{ marginTop: 56, marginBottom: 12 }}>{g.sources}</h2>
            <a
              className="source-link"
              href={
                fr
                  ? "https://www.canada.ca/fr/agence-consommation-matiere-financiere/services/planification-retraite.html"
                  : "https://www.canada.ca/en/financial-consumer-agency/services/retirement-planning.html"
              }
            >
              {fr
                ? "Agence de la consommation en matière financière du Canada — Planification de la retraite"
                : "Financial Consumer Agency of Canada — Retirement planning"}{" "}
              ↗
            </a>
            <a
              className="source-link"
              href="https://www.retraitequebec.gouv.qc.ca/fr/services-ligne-et-outils/seances-information-et-outils-planification"
            >
              Retraite Québec —{" "}
              {fr ? "Outils de planification" : "Planning tools (French)"} ↗
            </a>
          </div>
        </section>
        <Invitation lang={lang} />
      </>
    );
  }
  if (page === "ask") {
    const a = c.askPage;
    return (
      <>
        <PageHero
          lang={lang}
          title={a.title}
          description={a.description}
          kicker={a.kicker}
          crumb={c.nav.ask}
          art={heroArt(page, lang)}
          wide
        />
        <section className="section">
          <div className="wrap ask-page">
            <p className="ask-intro">{a.intro}</p>
            <AskList lang={lang} />
            <p className="form-hint">{c.disclaimer}</p>
          </div>
        </section>
        <section className="section ask-guide" aria-labelledby="ask-guide">
          <div className="wrap">
            <Link
              href={pathFor(lang, "resources")}
              aria-hidden="true"
              tabIndex={-1}
            >
              <Booklet lang={lang} />
            </Link>
            <div>
              <p className="eyebrow">{c.booklet.label}</p>
              <h2 className="ask-guide-line" id="ask-guide">
                {a.guideLine}
              </h2>
              <Link className="text-link" href={pathFor(lang, "resources")}>
                {c.booklet.read}
                {arrow}
              </Link>
            </div>
          </div>
        </section>
        <section className="section ivory invitation">
          <div className="wrap">
            <h2>{a.ownTitle}</h2>
            <p className="lede">{a.ownBody}</p>
            <div className="meet-actions">
              <MeetingLink lang={lang} />
              <a className="text-link" href={askMail(lang)}>
                {c.ask.ownQuestionLink}
              </a>
            </div>
            <p className="form-hint">{c.ask.noAccounts}</p>
          </div>
        </section>
      </>
    );
  }
  if (page === "fees")
    return (
      <>
        <PageHero lang={lang} title={c.feesTitle} description={c.feesDesc} />
        <section className="section">
          <div className="wrap">
            <Fees lang={lang} />
          </div>
        </section>
        <Invitation lang={lang} />
      </>
    );
  const content = pages[lang][page];
  const crumbs: Partial<Record<PageKey, string>> = {
    retirement: c.nav.retirement,
    investments: c.nav.investments,
    meeting: c.nav.meeting,
    about: c.nav.about,
  };
  const sections = (
    <div className="prose">
      {content.sections.map((s) => (
        <section key={s.heading} id={s.id}>
          {s.art && (
            <Reveal className="margin-art">
              <InkFile
                name={
                  s.art === "house"
                    ? "house"
                    : s.art === "travel"
                      ? "travel-bag"
                      : "bridge"
                }
                lang={lang}
              />
            </Reveal>
          )}
          <h2>{s.heading}</h2>
          {s.note && <p className="hand">{s.note}</p>}
          {s.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {s.items && (
            <ul>
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {page === "about" && (
        <>
          <a
            className="text-link"
            href="https://lautorite.qc.ca/grand-public/registres/registre-des-entreprises-et-des-individus-autorises-a-exercer"
          >
            {fr ? "Consulter le registre de l’AMF" : "Visit the AMF register"} ↗
          </a>
          <p style={{ marginTop: 25 }}>
            {Object.entries(business.socials).map(([name, url]) => (
              <a key={name} href={url} style={{ marginRight: 18 }}>
                {name}
              </a>
            ))}
          </p>
        </>
      )}
      {page === "investments" && (
        <Link className="text-link" href={pathFor(lang, "fees")}>
          {c.feesTitle}
        </Link>
      )}
    </div>
  );
  const contactMe = fr
    ? "Demander à Bill de vous contacter"
    : "Ask Bill to contact you";
  return (
    <>
      <PageHero
        lang={lang}
        title={content.title}
        description={content.description}
        kicker={content.kicker}
        crumb={crumbs[page]}
        cta={page !== "meeting" && page !== "privacy" && page !== "legal"}
        art={heroArt(page, lang)}
        wide={page === "meeting"}
      />
      {page === "meeting" && (
        <section className="meeting-options">
          <div className="wrap">
            <div className="meeting-actions">
              {business.bookingVerified && (
                <a className="button" href={business.bookingUrl}>
                  {c.meeting}
                  <span aria-hidden="true">→</span>
                </a>
              )}
              <a href={`tel:${business.tel}`}>{business.phone}</a>
              <a href={`mailto:${business.email}`}>{c.email}</a>
              {contactConfigured() && <a href="#contact">{contactMe}</a>}
            </div>
            {business.bookingVerified && (
              <p className="meeting-note">
                {fr
                  ? "Vous choisirez un moment qui vous convient dans l’agenda de Bill."
                  : "You’ll pick a time that suits you in Bill’s calendar."}
              </p>
            )}
          </div>
        </section>
      )}
      <section className="section">
        <div
          className={`wrap ${page === "about" ? "about-grid" : "content-layout"}`}
        >
          {page === "about" && (
            <figure className="portrait-wrap">
              <div className="print">
                <Portrait lang={lang} />
              </div>
              <figcaption className="hand">Bill Badran</figcaption>
            </figure>
          )}
          {sections}
        </div>
      </section>
      {page === "meeting" ? (
        <Contact lang={lang} meeting={false} />
      ) : page === "privacy" || page === "legal" ? null : (
        <Invitation lang={lang} />
      )}
    </>
  );
}
