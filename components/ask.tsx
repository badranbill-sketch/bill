import Link from "next/link";
import { business, type Language } from "@/lib/business";
import { askFeatured, askGroups } from "@/lib/ask";
import { t } from "@/lib/copy";

/** An email to Bill with the subject already written. */
export function askMail(lang: Language, subject = t(lang).ask.mailSubject) {
  return `mailto:${business.email}?subject=${encodeURIComponent(subject)}`;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const arrow = (
  <>
    {" "}
    <span aria-hidden="true">→</span>
  </>
);

/** The homepage cards: a few questions, each with its one-line answer. */
export function AskCards({ lang }: { lang: Language }) {
  return (
    <ol className="qa-list">
      {askFeatured(lang).map((q, i) => (
        <li key={q.key}>
          <Link className="qa" href={q.href}>
            <span className="number" aria-hidden="true">
              {i + 1}.
            </span>
            <h3>{q.question}</h3>
            <p>{q.teaser}</p>
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** The chapters of the guide, each with its questions. */
export function GuideContents({ lang }: { lang: Language }) {
  return (
    <ol className="chapters">
      {askGroups(lang).map((g, i) => (
        <li key={g.key}>
          <span className="number" aria-hidden="true">
            {ROMAN[i]}.
          </span>
          <div>
            <h3>{g.title}</h3>
            <p>{g.blurb}</p>
            <ul>
              {g.questions.map((q) => (
                <li key={q.key}>
                  <Link href={q.href}>{q.question}</Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The Ask Bill page: every question, grouped, with its short answer. */
export function AskList({ lang }: { lang: Language }) {
  const a = t(lang).askPage;
  return (
    <div className="ask-list">
      {askGroups(lang).map((g, i) => (
        <section key={g.key} aria-labelledby={`group-${g.key}`}>
          <header className="ask-group">
            <p className="number" aria-hidden="true">
              {ROMAN[i]}.
            </p>
            <h2 id={`group-${g.key}`}>{g.title}</h2>
            <p>{g.blurb}</p>
          </header>
          {g.questions.map((q) => (
            <article className="ask-item" id={q.anchor} key={q.key}>
              <h3>{q.question}</h3>
              <p>{q.answer}</p>
              {q.points.length > 0 && (
                <>
                  <p className="ask-points-label">{a.pointsLabel}</p>
                  <ul>
                    {q.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </>
              )}
              <Link className="text-link" href={q.more}>
                {a.moreLabel}
                <span className="sr-only">: {q.question}</span>
                {arrow}
              </Link>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

/** A visitor's own question, by email, with a word about what not to send. */
export function AskOwn({ lang }: { lang: Language }) {
  const c = t(lang);
  return (
    <div className="ask-own">
      <p>{c.ask.ownQuestion}</p>
      <a className="text-link" href={askMail(lang)}>
        {c.ask.ownQuestionLink}
        {arrow}
      </a>
      <p className="form-hint">{c.ask.noAccounts}</p>
    </div>
  );
}
