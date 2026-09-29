import Image from "next/image";
import Link from "next/link";
import { business, type Language } from "@/lib/business";
import { askVideos, features } from "@/lib/features";
import { pathFor } from "@/lib/routes";
import { Reveal } from "./reveal";
import { InkFile } from "./ink/file";
import { QuestionCarousel } from "./question-carousel";

function VideoCard({ lang, index }: { lang: Language; index: number }) {
  const a = features[lang].ask;
  const video = askVideos[index];
  const href = video.href?.[lang];
  const readHref = `${pathFor(lang, "retirement")}#${video.anchor[lang]}`;
  return (
    <li>
      <a className="video-card" href={href || readHref}>
        <div className="video-poster">
          {video.poster ? (
            <Image
              className="video-photo"
              src={video.poster}
              alt=""
              fill
              sizes="(max-width: 760px) 80vw, (max-width: 1100px) 42vw, 22vw"
            />
          ) : (
            <InkFile name={video.art} lang={lang} />
          )}
          <span className="episode-number">0{index + 1}</span>
          {href && <span className="play" aria-hidden="true" />}
        </div>
        <div className="video-body">
          <h3>{a.questions[index]}</h3>
          <span className="video-watch">{href ? a.watch : a.read}</span>
          {!href && <span className="video-status">{a.soon}</span>}
        </div>
      </a>
    </li>
  );
}

export function Features({
  lang,
  review = false,
}: {
  lang: Language;
  review?: boolean;
}) {
  const f = features[lang];
  const g = business.guides[lang];
  const downloadable = Boolean(g?.approved) || review;
  const guideHref = g?.approved
    ? g.path
    : review
      ? "/api/guide"
      : pathFor(lang, "resources");
  return (
    <section className="feat" id="guide" aria-label={f.guide.label}>
      <div className="wrap">
        <div className="feat-top">
          <div className="feat-card feat-journey">
            <Reveal className="feat-art">
              <InkFile name="hiker" lang={lang} />
            </Reveal>
            <div className="feat-journey-copy">
              <p className="eyebrow">{f.journey.label}</p>
              <h2>{f.journey.title}</h2>
              <a className="text-link" href="#parcours">
                {f.journey.link}
              </a>
            </div>
          </div>
          <div className="feat-card feat-guide">
            <div className="feat-guide-copy">
              <p className="eyebrow">{f.guide.label}</p>
              <h2>{f.guide.title}</h2>
              <p className="guide-body">{f.guide.body}</p>
            </div>
            <a
              className="book"
              href={guideHref}
              aria-label={f.guide.preview}
              target={downloadable ? "_blank" : undefined}
              rel={downloadable ? "noopener" : undefined}
            >
              <Image
                src="/assets/retirement-guide-cover.jpg"
                width={534}
                height={800}
                alt="Build a Better Retirement Together — Bill Badran"
                sizes="(max-width: 760px) 210px, 250px"
              />
            </a>
            <div className="guide-actions">
              <a
                className="button"
                href={guideHref}
                target={downloadable ? "_blank" : undefined}
                rel={downloadable ? "noopener" : undefined}
              >
                {downloadable ? f.guide.cta : f.guide.explore}
              </a>
              <p className="guide-note">
                {g?.approved
                  ? f.guide.pdf
                  : review
                    ? f.guide.review
                    : f.guide.pending}
              </p>
              <details className="guide-contents">
                <summary>{f.guide.inside}</summary>
                <ul>
                  {f.guide.chapters.map((chapter) => (
                    <li key={chapter}>{chapter}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </div>
        <section className="ask" id="questions" aria-labelledby="ask-bill">
          <div className="ask-intro">
            <p className="eyebrow">{f.ask.label}</p>
            <h2 id="ask-bill">
              {f.ask.title} <span aria-hidden="true">—</span>
            </h2>
            <p className="ask-lede">{f.ask.intro}</p>
            <Link className="text-link" href={pathFor(lang, "retirement")}>
              {f.ask.all}
            </Link>
          </div>
          <QuestionCarousel
            count={askVideos.length}
            label={f.ask.list}
            lang={lang}
          >
            {askVideos.map((_, i) => (
              <VideoCard key={i} lang={lang} index={i} />
            ))}
          </QuestionCarousel>
        </section>
      </div>
    </section>
  );
}

/** One closing invitation, after Bill's approach and the meeting explanation. */
export function Conversation({ lang }: { lang: Language }) {
  const f = features[lang];
  return (
    <section className="talk" id="conversation">
      <Reveal className="talk-art">
        <InkFile name="dock" lang={lang} />
      </Reveal>
      <div className="wrap talk-grid">
        <div className="talk-copy">
          <p className="eyebrow">{f.talk.label}</p>
          <h2>{f.talk.title}</h2>
          <p>{f.talk.body}</p>
          <Link className="button" href={pathFor(lang, "meeting")}>
            {f.talk.cta}
          </Link>
          <a className="talk-phone" href={`tel:${business.tel}`}>
            {f.talk.call} {business.phone}
          </a>
        </div>
        <p className="talk-sign">
          <span>“{f.talk.sign}”</span>
          <span>{f.talk.signed}</span>
        </p>
      </div>
    </section>
  );
}
