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
import { Features, Conversation } from "./features";
import { Reveal } from "./reveal";
import { DESK } from "./ink/desk";
import { InkFile } from "./ink/file";

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

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
 * One reading and focus order on every screen: introduction, guide and
 * questions, Bill, the journey, then a first conversation.
 */
export function Home({ lang, review }: { lang: Language; review: boolean }) {
  const c = t(lang);
  const { photo } = DESK;
  return (
    <>
      <section className="hero" id="intro">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>
              <span>{c.hero}</span> <em>{c.heroAccent}</em>
            </h1>
            <p className="lede">{c.intro}</p>
            <div className="hero-actions">
              <MeetingLink lang={lang} />
              <Link className="text-link" href="#guide">
                {lang === "fr"
                  ? "Commencer par le guide"
                  : "Start with the guide"}
              </Link>
            </div>
            <div className="hero-person">
              <Portrait lang={lang} sizes="48px" />
              <p>
                <strong>Bill Badran</strong>
                <span>
                  {lang === "fr"
                    ? "Planificateur financier · Laval"
                    : "Financial planner · Laval"}
                </span>
              </p>
            </div>
          </div>
          <div className="hero-mobile-art">
            <InkFile name="hiker" lang={lang} priority />
          </div>
          <figure className="hero-art">
            <InkFile name="desk" lang={lang} priority />
            <div
              className="hero-photo"
              style={{
                left: pct(photo.x, DESK.w),
                top: pct(photo.y, DESK.h),
                width: pct(photo.w, DESK.w),
                height: pct(photo.h, DESK.h),
                transform: `rotate(${photo.rotate}deg)`,
              }}
            >
              <Portrait
                lang={lang}
                priority
                sizes="(max-width: 900px) 150px, 17vw"
              />
            </div>
            <div className="overlay">
              <InkFile name="desk-caption" lang={lang} priority />
            </div>
          </figure>
        </div>
      </section>
      <div className="home-flow">
        <Features lang={lang} review={review} />
        <section className="section philosophy" id="about-bill">
          <div className="wrap">
            <div>
              <p className="eyebrow">{c.philosophyLabel}</p>
              <Reveal>
                <InkFile name="letter" lang={lang} />
              </Reveal>
            </div>
            <div>
              <h2>
                {c.philosophy} <em>{c.philosophyAccent}</em>
              </h2>
              <p className="body">{c.philosophyBody}</p>
              <Link className="text-link" href={pathFor(lang, "about")}>
                {c.meetBill}
              </Link>
              <p className="credibility">
                <strong>{c.experience}</strong>
                <span>{c.experienceSub}</span>
              </p>
            </div>
          </div>
        </section>
        <Ride lang={lang} />
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
        <Conversation lang={lang} />
      </div>
    </>
  );
}

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
      return <InkFile name="two-chairs" lang={lang} priority />;
    case "resources":
      return <InkFile name="questions-notebook" lang={lang} priority />;
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
    return (
      <>
        <PageHero
          lang={lang}
          title={g.title}
          description={g.description}
          crumb={c.nav[4]}
          art={heroArt(page, lang)}
        />
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
    retirement: c.nav[0],
    investments: c.nav[1],
    meeting: c.nav[2],
    about: c.nav[3],
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
                  ? "Vous choisirez un moment dans l’agenda de Bill (Calendly)."
                  : "You’ll pick a time in Bill’s calendar (Calendly)."}
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
