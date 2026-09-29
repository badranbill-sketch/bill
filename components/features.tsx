import Image from "next/image";
import Link from "next/link";
import { business, type Language } from "@/lib/business";
import { askVideos, features } from "@/lib/features";
import { pathFor } from "@/lib/routes";
import { Reveal } from "./reveal";
import { InkFile } from "./ink/file";

/** A small sunrise, drawn as a pen mark, for the guide's cover. */
function Sunrise() {
  return (
    <svg
      className="book-sun"
      viewBox="0 0 48 30"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11 26a13 13 0 0 1 26 0" />
      <path d="M4 26h40" />
      <path d="M24 3v5M9 9l3.5 3.5M39 9l-3.5 3.5M2.5 19.5l4.6 1.2M45.5 19.5l-4.6 1.2" />
    </svg>
  );
}

/** The guide's cover: set in type, not photographed, so nothing is invented. */
function Book({ lang }: { lang: Language }) {
  const g = features[lang].guide;
  return (
    <div className="book" aria-hidden="true">
      <div className="book-cover">
        <p className="book-title">{g.title}</p>
        <p className="book-sub">{g.subtitle}</p>
        <Sunrise />
        <p className="book-author">{g.author}</p>
      </div>
    </div>
  );
}

function VideoCard({ lang, index }: { lang: Language; index: number }) {
  const a = features[lang].ask;
  const video = askVideos[index];
  const href = video.href?.[lang];
  const question = a.questions[index];
  const inner = (
    <>
      <div className="video-poster">
        {video.poster ? (
          <Image
            className="video-photo"
            src={video.poster}
            alt=""
            fill
            sizes="(max-width: 520px) 90vw, (max-width: 1000px) 44vw, 20vw"
          />
        ) : (
          <InkFile name={video.art} lang={lang} />
        )}
        <span className="play" aria-hidden="true" />
      </div>
      <div className="video-body">
        <h3>{question}</h3>
        {href ? (
          <span className="video-watch">{a.watch} →</span>
        ) : (
          <span className="video-watch soon">{a.soon}</span>
        )}
      </div>
    </>
  );
  return (
    <li>
      {href ? (
        <a className="video-card" href={href}>
          {inner}
        </a>
      ) : (
        <div className="video-card">{inner}</div>
      )}
    </li>
  );
}

/**
 * What follows the mountain ride: the journey and guide cards, the "Ask
 * Bill" video row, and the closing invitation on a dark band. Still apart
 * from the drawings appearing once, like the rest of the page after the ride.
 */
export function Features({ lang }: { lang: Language }) {
  const f = features[lang];
  const g = business.guides[lang];
  const guideHref = g && g.approved ? g.path : pathFor(lang, "resources");
  return (
    <>
      <section className="feat">
        <div className="wrap">
          <div className="feat-top">
            <div className="feat-card feat-journey">
              <Reveal className="feat-art">
                <InkFile name="hiker" lang={lang} />
              </Reveal>
              <div className="feat-journey-copy">
                <h2>{f.journey.title}</h2>
                <Link className="text-link" href={pathFor(lang, "retirement")}>
                  {f.journey.link} →
                </Link>
              </div>
            </div>
            <div className="feat-card feat-guide">
              <div className="feat-guide-copy">
                <p className="eyebrow">{f.guide.label}</p>
                <h2>{f.guide.title}</h2>
                <p className="guide-sub">{f.guide.subtitle}</p>
                <p className="guide-body">{f.guide.body}</p>
                <Link className="button" href={guideHref}>
                  {f.guide.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              <Book lang={lang} />
            </div>
          </div>

          <section className="ask" aria-labelledby="ask-bill">
            <div className="ask-intro">
              <p className="eyebrow">{f.ask.label}</p>
              <h2 id="ask-bill">
                {f.ask.title} <span aria-hidden="true">—</span>
              </h2>
              <p className="ask-lede">{f.ask.intro}</p>
              <Link className="text-link" href={pathFor(lang, "retirement")}>
                {f.ask.all} →
              </Link>
            </div>
            <ul className="video-list" aria-label={f.ask.list}>
              {askVideos.map((_, i) => (
                <VideoCard key={i} lang={lang} index={i} />
              ))}
            </ul>
          </section>
        </div>
      </section>

      <section className="talk">
        <Reveal className="talk-art">
          <InkFile name="dock" lang={lang} />
        </Reveal>
        <div className="wrap talk-grid">
          <div className="talk-copy">
            <h2>{f.talk.title}</h2>
            <p>{f.talk.body}</p>
            <Link className="button" href={pathFor(lang, "about")}>
              {f.talk.cta}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="talk-sign">
            <span>“{f.talk.sign}”</span>
            <span>{f.talk.signed}</span>
          </p>
        </div>
      </section>
    </>
  );
}
