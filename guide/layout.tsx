import type { ReactNode } from "react";
import { business, type Language } from "@/lib/business";
import { copy, sources, type Copy } from "./copy";
import { boxPath, cardPath, clipPath, ringPath, underlinePath } from "./marks";
import * as Art from "./art";

/*
 * The guide, page by page. Each page is laid out on its own, like a
 * magazine: an 816 × 1056 box (US Letter at 96 px/in) with absolutely
 * placed blocks. Even pages are left-hand pages; the cover is page 1.
 *
 * The rhythm alternates on purpose: a drawing, a page of text, a plate,
 * a worksheet, a page with one thought. See guide/README.md for the map.
 */

type Ctx = { c: Copy; lang: Language; final?: boolean };

/** *italic* → <em>. */
function rich(s: string): ReactNode {
  const parts = s.split(/\*([^*]+)\*/g);
  return parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : p));
}

function Page({
  n,
  children,
  folio,
  light,
  className,
}: {
  n: number;
  children: ReactNode;
  /** Right pages: the chapter's short title. Left pages: the running title. */
  folio?: string | false;
  light?: boolean;
  className?: string;
}) {
  const side = n % 2 === 0 ? "left" : "right";
  return (
    <section
      className={`page ${side}${className ? ` ${className}` : ""}`}
      data-page={n}
    >
      {children}
      {folio !== false && folio !== undefined && (
        <footer className={`folio${light ? " light" : ""}`}>
          <b>{n}</b>
          <span>{folio}</span>
        </footer>
      )}
    </section>
  );
}

/** A block placed on the page: x, y (and width) in page pixels. */
function At({
  x,
  y,
  w,
  children,
  className,
  style,
}: {
  x: number;
  y: number;
  w?: number;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`abs${className ? ` ${className}` : ""}`}
      style={{ left: x, top: y, width: w, ...style }}
    >
      {children}
    </div>
  );
}

function Mark({ n, seed }: { n: number | string; seed?: number }) {
  return (
    <span className="mark">
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d={ringPath(seed ?? Number(n) + 1)} />
      </svg>
      {n}
    </span>
  );
}

function Check({ seed }: { seed: number }) {
  return (
    <span className="check" aria-hidden="true">
      <svg viewBox="0 0 13 13">
        <path d={boxPath(seed)} />
      </svg>
    </span>
  );
}

function Underline({ w, seed = 3 }: { w: number; seed?: number }) {
  return (
    <svg
      width={w}
      height={6}
      viewBox={`0 0 ${w} 6`}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <path
        d={underlinePath(seed, w)}
        fill="none"
        stroke="var(--brass)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Hand({
  x,
  y,
  children,
  rotate = -2.5,
  size = 25,
  brass,
}: {
  x: number;
  y: number;
  children: ReactNode;
  rotate?: number;
  size?: number;
  brass?: boolean;
}) {
  return (
    <div
      className={`abs hand${brass ? " brass" : ""}`}
      style={{
        left: x,
        top: y,
        fontSize: size,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {children}
    </div>
  );
}

function Ask({ n, label, q }: { n: number; label: string; q: string }) {
  return (
    <div className="ask">
      <Mark n={n} seed={n + 20} />
      <span className="ask-label">{label}</span>
      <p className="ask-q">{q}</p>
    </div>
  );
}

function Opener({
  n,
  title,
  lead,
}: {
  n: string;
  title: string;
  lead?: string;
}) {
  return (
    <>
      <p className="num">{n}</p>
      <h1>{title}</h1>
      {lead && <p className="lead">{rich(lead)}</p>}
    </>
  );
}

const ui = {
  en: {
    ask: "A question to bring",
    inside: "Inside",
    pages: "Contents",
  },
  fr: {
    ask: "Une question à apporter",
    inside: "Au sommaire",
    pages: "Sommaire",
  },
};

/** Every question to bring, in order, for the last worksheet. */
function allQuestions(c: Copy) {
  return [
    c.ch1.question,
    c.ch2.question,
    c.ch3.question,
    c.ch4.question,
    c.ch4.question2,
    c.ch5.question,
    c.ch6.question,
    c.ch7.question,
    c.ch8.question,
    c.ch9.question,
  ];
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function Cover({ c, lang }: Ctx) {
  return (
    <Page n={1}>
      <At x={80} y={70} className="brand">
        <span className="monogram" aria-hidden="true" />
        <span className="brand-name">{business.name}</span>
      </At>
      <At x={80} y={168} w={640}>
        <h1 className="cover-title">
          {c.cover.title.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </h1>
        <p className="cover-sub">{c.cover.subtitle}</p>
      </At>
      <div className="art" style={{ left: 0, top: 440, width: 816 }}>
        <Art.CoverArt lang={lang} />
      </div>
    </Page>
  );
}

function Letter({ c }: Ctx) {
  const toc: [string, string, number][] = [
    ["", c.opening.title.replace(/\.$/, ""), 4],
    [c.ch1.n, c.ch1.short, 6],
    [c.ch2.n, c.ch2.short, 8],
    [c.ch3.n, c.ch3.short, 10],
    [c.ch4.n, c.ch4.short, 12],
    [c.ch5.n, c.ch5.short, 16],
    [c.ch6.n, c.ch6.short, 18],
    [c.ch7.n, c.ch7.short, 20],
    [c.ch8.n, c.ch8.short, 22],
    [c.ch9.n, c.ch9.short, 24],
    [c.ch10.n, c.ch10.short, 26],
    ["", c.questions.title, 27],
    ["", c.meeting.title.replace(/\.$/, ""), 29],
  ];
  return (
    <Page n={2} folio={c.running}>
      <At x={64} y={88} w={530}>
        <h2>{c.letter.title}</h2>
        <div style={{ marginTop: 22 }}>
          {c.letter.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="hand" style={{ fontSize: 32, marginTop: 4 }}>
          — {c.letter.sign}
        </div>
      </At>
      <At x={64} y={586} w={672}>
        <p className="kicker">{c.letter.contents}</p>
        <ol className="toc">
          {toc.map(([n, t, p]) => (
            <li key={t}>
              <span className="toc-n">{n}</span>
              <span className="toc-t">{t}</span>
              <span className="toc-p">{p}</span>
            </li>
          ))}
        </ol>
      </At>
    </Page>
  );
}

function Statement({ c }: Ctx) {
  return (
    <Page n={3} folio={c.opening.title.replace(/\.$/, "")} light>
      <At x={80} y={330} w={600}>
        <p className="st-small">{c.statement.before}</p>
        <p className="st-q1">{c.statement.q1}</p>
        <p className="st-small" style={{ marginTop: 64 }}>
          {c.statement.after}
        </p>
        <p className="st-q2">{c.statement.q2}</p>
        <div style={{ marginTop: 4, marginLeft: 2 }}>
          <Underline w={210} seed={11} />
        </div>
      </At>
    </Page>
  );
}

function Opening({ c, lang }: Ctx) {
  return (
    <Page n={4} folio={c.running}>
      <At x={64} y={92} w={560}>
        <p className="kicker">{c.opening.kicker}</p>
        <h1>{c.opening.title}</h1>
      </At>
      <At x={64} y={218} w={440}>
        {c.opening.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </At>
      <div className="art" style={{ left: 40, top: 640, width: 360 }}>
        <Art.AloneDesk lang={lang} />
      </div>
      <At x={400} y={790} w={220}>
        <p className="caption">{c.opening.aloneCaption}</p>
      </At>
    </Page>
  );
}

function TablePlan({ c, lang }: Ctx) {
  return (
    <Page n={5} folio={c.opening.title.replace(/\.$/, "")}>
      <At x={80} y={92} w={560}>
        <h2>{c.opening.tableTitle}</h2>
      </At>
      <div className="art" style={{ left: 80, top: 176, width: 672 }}>
        <Art.TablePlan lang={lang} />
      </div>
      <At x={80} y={846} w={400}>
        <p className="caption">{c.opening.tableCaption}</p>
      </At>
      <Hand x={520} y={880} rotate={-3}>
        {c.opening.note}
      </Hand>
    </Page>
  );
}

function Porch({ c, lang }: Ctx) {
  return (
    <Page n={6} folio={false}>
      <div className="art" style={{ left: 0, top: 0, width: 816 }}>
        <Art.Porch lang={lang} />
      </div>
      <footer className="folio light">
        <b>6</b>
      </footer>
      {void c}
    </Page>
  );
}

function Ch1({ c, lang }: Ctx) {
  const t = c.ch1;
  return (
    <Page n={7} folio={t.short}>
      <At x={80} y={78} w={672}>
        <div style={{ maxWidth: 560 }}>
          <Opener n={t.n} title={t.title} lead={t.lead} />
          {t.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="small" style={{ marginTop: 14, marginBottom: 12 }}>
            {t.listIntro}
          </p>
        </div>
        <div className="items two">
          {t.items.map((it) => (
            <div className="item" key={it.title}>
              <h3>{it.title}</h3>
              <p>{it.text}</p>
            </div>
          ))}
        </div>
        <p className="note-line">{t.couple}</p>
      </At>
      <At x={80} y={880} w={672}>
        <Ask n={1} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Ch2({ c, lang }: Ctx) {
  const t = c.ch2;
  return (
    <Page n={8} folio={c.running}>
      <At x={64} y={78} w={560}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
        <div style={{ maxWidth: 480 }}>
          {t.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="numbered" style={{ marginTop: 26 }}>
          {t.kinds.map((k, i) => (
            <div className="row" key={k.title}>
              <Mark n={i + 1} seed={i + 40} />
              <div>
                <h3>{k.title}</h3>
                <p>{k.text}</p>
              </div>
            </div>
          ))}
        </div>
      </At>
      <At x={64} y={880} w={672}>
        <Ask n={2} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Ch2Plate({ c, lang }: Ctx) {
  const t = c.ch2;
  return (
    <Page n={9} folio={t.short}>
      <At x={80} y={78} w={560}>
        <p className="caption" style={{ fontSize: 14 }}>
          {t.plateTitle}
        </p>
      </At>
      <div className="art" style={{ left: 80, top: 106, width: 672 }}>
        <Art.SpendingTable lang={lang} />
      </div>
      <At x={80} y={600} w={672}>
        <p className="kicker">{t.worksheetTitle}</p>
        <table className="sheet">
          <thead>
            <tr>
              <th />
              {t.worksheetCols.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.kinds.map((k, i) => (
              <tr key={k.title}>
                <td>
                  <span className="sheet-n">{i + 1}</span> {k.title}
                </td>
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small" style={{ marginTop: 16, maxWidth: 520 }}>
          {t.shape}
        </p>
      </At>
      <Hand x={500} y={576} rotate={-4}>
        {t.margin}
      </Hand>
    </Page>
  );
}

function Ch3({ c, lang }: Ctx) {
  const t = c.ch3;
  return (
    <Page n={10} folio={c.running}>
      <At x={64} y={78} w={580}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
        <div style={{ maxWidth: 500 }}>
          {t.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="sources-list" style={{ marginTop: 18 }}>
          {t.sources.map((s) => (
            <div className="item" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
        <div className="aside" style={{ marginTop: 22, maxWidth: 520 }}>
          <p>{t.where}</p>
        </div>
      </At>
      <At x={64} y={890} w={672}>
        <Ask n={3} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Ch3Gap({ c, lang }: Ctx) {
  const t = c.ch3;
  return (
    <Page n={11} folio={t.short}>
      <At x={80} y={92} w={560}>
        <h2>{t.gapTitle}</h2>
        <p style={{ marginTop: 16, maxWidth: 470 }}>{t.gapBody}</p>
      </At>
      <div className="art" style={{ left: 80, top: 290, width: 672 }}>
        <Art.GapChart lang={lang} />
      </div>
      <At x={80} y={860} w={420}>
        <p className="caption">{t.gapCaption}</p>
      </At>
    </Page>
  );
}

function JobCard({ c, which }: { c: Copy; which: "old" | "new" }) {
  const t = which === "old" ? c.ch4.oldCard : c.ch4.newCard;
  const L = c.ch4.labels;
  const big = which === "old";
  return (
    <div className={`jobcard ${which}`}>
      <div className="jc-head">
        <h3>{t.heading}</h3>
        <span>{t.role}</span>
      </div>
      <div className="jc-row">
        <span className="jc-label">{L.duties}</span>
        {big ? (
          <p className="jc-big">{t.duties[0]}</p>
        ) : (
          <ul className="jc-duties">
            {t.duties.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="jc-row">
        <span className="jc-label">{L.schedule}</span>
        <p>{t.schedule}</p>
      </div>
      <div className="jc-row">
        <span className="jc-label">{L.badYear}</span>
        <p>{t.badYear}</p>
      </div>
    </div>
  );
}

function Card({
  w,
  h,
  seed,
  rotate,
  children,
  x,
  y,
  clip = true,
}: {
  w: number;
  h: number;
  seed: number;
  rotate: number;
  children: ReactNode;
  x: number;
  y: number;
  clip?: boolean;
}) {
  return (
    <div
      className="abs card"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <svg
        className="card-edge"
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        aria-hidden="true"
      >
        <path d={cardPath(seed, w, h)} />
      </svg>
      {clip && (
        <svg
          className="clip"
          viewBox="0 0 16 62"
          width={16}
          height={62}
          aria-hidden="true"
        >
          <path d={clipPath()} />
        </svg>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

function Ch4a({ c }: Ctx) {
  const t = c.ch4;
  return (
    <Page n={12} folio={c.running}>
      <At x={64} y={78} w={560}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
      </At>
      <Card x={76} y={520} w={430} h={262} seed={5} rotate={-1.6}>
        <JobCard c={c} which="old" />
      </Card>
    </Page>
  );
}

function Ch4b({ c, lang }: Ctx) {
  const t = c.ch4;
  return (
    <Page n={13} folio={t.short}>
      <Card x={104} y={92} w={586} h={420} seed={9} rotate={0.9}>
        <JobCard c={c} which="new" />
      </Card>
      <At x={80} y={586} w={500}>
        <p>{t.after}</p>
      </At>
      <Hand x={380} y={716} rotate={-4}>
        {t.margin}
      </Hand>
      <At x={80} y={880} w={672}>
        <Ask n={4} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Storm({ c, lang }: Ctx) {
  const t = c.ch4;
  return (
    <Page n={14} folio={c.running}>
      <div className="art" style={{ left: 0, top: 0, width: 816 }}>
        <Art.Storm lang={lang} />
      </div>
      <At x={64} y={636} w={420}>
        <p className="caption">{t.stormCaption}</p>
      </At>
      <At x={64} y={678} w={640}>
        <h2>{t.seqTitle}</h2>
        <div style={{ marginTop: 14 }}>
          {t.seqBody.map((b) => (
            <p key={b}>{b}</p>
          ))}
          <p>{rich(t.seqName)}</p>
        </div>
      </At>
    </Page>
  );
}

function Sequence({ c, lang }: Ctx) {
  const t = c.ch4;
  const p = t.panels;
  return (
    <Page n={15} folio={t.short}>
      <At x={80} y={92} w={560}>
        <p className="kicker">{p.kicker}</p>
        <p className="lead" style={{ margin: 0 }}>
          {p.intro}
        </p>
      </At>
      <At x={80} y={230} w={672}>
        <div className="panels">
          <div className="panel">
            <h3>{p.saving}</h3>
            <Art.SequencePanel lang={lang} mode="saving" />
            <p>{p.savingText}</p>
          </div>
          <div className="panel">
            <h3>{p.drawing}</h3>
            <Art.SequencePanel lang={lang} mode="drawing" />
            <p>{p.drawingText}</p>
          </div>
        </div>
      </At>
      <At x={80} y={660} w={540}>
        <p>{t.seqNote}</p>
        <p className="caption" style={{ marginTop: 14 }}>
          {t.seqCaption}
        </p>
      </At>
      <At x={80} y={880} w={672}>
        <Ask n={5} label={ui[lang].ask} q={t.question2} />
      </At>
    </Page>
  );
}

function Ch5({ c, lang }: Ctx) {
  const t = c.ch5;
  return (
    <Page n={16} folio={c.running}>
      <At x={64} y={78} w={580}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
        <div className="numbered" style={{ marginTop: 8 }}>
          {t.items.map((k, i) => (
            <div className="row" key={k.title}>
              <Mark n={i + 1} seed={i + 60} />
              <div>
                <h3>{k.title}</h3>
                <p>{k.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="small" style={{ marginTop: 18, maxWidth: 480 }}>
          {t.after}
        </p>
      </At>
      <At x={64} y={880} w={672}>
        <Ask n={6} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Ch5Thought({ c, lang }: Ctx) {
  const t = c.ch5;
  return (
    <Page n={17} folio={t.short}>
      <At x={80} y={250} w={570}>
        <p className="thought">{t.thought}</p>
      </At>
      <div className="art" style={{ left: 150, top: 560, width: 520 }}>
        <Art.Canoe lang={lang} />
      </div>
      <Hand x={200} y={830} rotate={-2} size={24}>
        {t.canoe}
      </Hand>
    </Page>
  );
}

function Horizons({ c, lang }: Ctx) {
  return (
    <Page n={18} folio={false}>
      <div className="art" style={{ left: 0, top: 0, width: 816 }}>
        <Art.Horizons lang={lang} />
      </div>
      <footer className="folio light">
        <b>18</b>
      </footer>
      {void c}
    </Page>
  );
}

function Ch6({ c, lang }: Ctx) {
  const t = c.ch6;
  return (
    <Page n={19} folio={t.short}>
      <At x={80} y={78} w={580}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
        <div style={{ maxWidth: 500 }}>
          {t.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="numbered" style={{ marginTop: 18 }}>
          {t.horizons.map((k, i) => (
            <div className="row" key={k.title}>
              <Mark n={["a", "b", "c"][i]} seed={i + 80} />
              <div>
                <h3>{k.title}</h3>
                <p>{k.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 18 }}>{t.after}</p>
        <p className="small">{t.caveat}</p>
      </At>
      <At x={80} y={880} w={672}>
        <Ask n={7} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Ch7Art({ c, lang }: Ctx) {
  const t = c.ch7;
  return (
    <Page n={20} folio={c.running}>
      <div className="art" style={{ left: 40, top: 80, width: 720 }}>
        <Art.Containers lang={lang} />
      </div>
      <At x={64} y={640} w={420}>
        <p className="caption">{t.containersCaption}</p>
      </At>
      <At x={64} y={760} w={440}>
        <div className="aside">
          <h4>{t.good.title}</h4>
          <p>{t.good.text}</p>
        </div>
      </At>
    </Page>
  );
}

function Ch7({ c, lang }: Ctx) {
  const t = c.ch7;
  return (
    <Page n={21} folio={t.short}>
      <At x={80} y={78} w={600}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
        {t.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </At>
      <div className="art" style={{ left: 80, top: 690, width: 672 }}>
        <Art.PlanDiagram lang={lang} />
      </div>
      <At x={80} y={880} w={672}>
        <Ask n={8} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Ch8({ c, lang }: Ctx) {
  const t = c.ch8;
  return (
    <Page n={22} folio={c.running}>
      <At x={64} y={78} w={600}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
        <div className="sources-list" style={{ marginTop: 8, maxWidth: 560 }}>
          {t.families.map((s) => (
            <div className="item" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 18, maxWidth: 540 }}>{t.body[0]}</p>
      </At>
      <At x={64} y={880} w={672}>
        <Ask n={9} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Ch8Chart({ c, lang }: Ctx) {
  const t = c.ch8;
  return (
    <Page n={23} folio={t.short}>
      <At x={80} y={84} w={560}>
        <h3 style={{ fontSize: 22 }}>{t.chartTitle}</h3>
        <p style={{ marginTop: 10, maxWidth: 520 }}>{t.chartText}</p>
      </At>
      <div className="art" style={{ left: 80, top: 222, width: 640 }}>
        <Art.FeeChart lang={lang} />
      </div>
      <At x={80} y={468} w={520}>
        <p className="caption">{t.chartCaption}</p>
      </At>
      <At x={80} y={580} w={560}>
        <p className="kicker">{t.askTitle}</p>
        <ul className="checks">
          {t.ask.map((q, i) => (
            <li key={q}>
              <Check seed={i + 3} />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </At>
      <At x={80} y={820} w={520}>
        <div className="aside">
          <h4>{t.good.title}</h4>
          <p>{t.good.text}</p>
        </div>
      </At>
      <Hand x={560} y={560} rotate={-4}>
        {t.margin}
      </Hand>
    </Page>
  );
}

function Ch9({ c, lang }: Ctx) {
  const t = c.ch9;
  return (
    <Page n={24} folio={c.running}>
      <div className="art" style={{ left: 0, top: 0, width: 816 }}>
        <Art.Harbour lang={lang} />
      </div>
      <At x={64} y={430} w={600}>
        <Opener n={t.n} title={t.title} lead={t.lead} />
        <div style={{ maxWidth: 540 }}>
          {t.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </At>
    </Page>
  );
}

function Ch9Sheet({ c, lang }: Ctx) {
  const t = c.ch9;
  return (
    <Page n={25} folio={t.short}>
      <At x={80} y={84} w={672}>
        <h2 style={{ maxWidth: 600 }}>{t.sheetTitle}</h2>
        <p style={{ marginTop: 14, maxWidth: 520 }}>{t.sheetIntro}</p>
        <div className="sheet-qs" style={{ marginTop: 30 }}>
          {t.questions.map((q, i) => (
            <div className="sheet-q" key={q}>
              <Mark n={i + 1} seed={i + 100} />
              <div>
                <p>{q}</p>
                <div className="lines">
                  <span />
                  <span />
                </div>
              </div>
            </div>
          ))}
        </div>
      </At>
      <At x={80} y={890} w={672}>
        <div className="dated">
          <span>{t.dated}</span>
          <span className="blank" />
        </div>
        <Ask n={10} label={ui[lang].ask} q={t.question} />
      </At>
    </Page>
  );
}

function Checklist({ c }: Ctx) {
  const t = c.ch10;
  let k = 0;
  return (
    <Page n={26} folio={c.running}>
      <At x={64} y={78} w={600}>
        <p className="num">{t.n}</p>
        <h1>{t.title}</h1>
        <p className="lead" style={{ margin: "10px 0 0" }}>
          {t.lead}
        </p>
      </At>
      <At x={64} y={270} w={672}>
        <div className="groups">
          {t.groups.map((g) => (
            <div className="group" key={g.verb}>
              <div className="group-head">
                <h3>{g.verb}</h3>
                <p>{g.q}</p>
              </div>
              <ul className="checks">
                {g.items.map((it) => (
                  <li key={it}>
                    <Check seed={k++ + 30} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </At>
    </Page>
  );
}

function Questions({ c }: Ctx) {
  const qs = allQuestions(c);
  return (
    <Page n={27} folio={c.questions.title}>
      <At x={80} y={84} w={600}>
        <h2>{c.questions.title}</h2>
        <p className="lead" style={{ margin: "8px 0 0", fontSize: 17 }}>
          {c.questions.lead}
        </p>
      </At>
      <At x={80} y={200} w={672}>
        <div className="qlist">
          {qs.map((q, i) => (
            <div className="q" key={q}>
              <Mark n={i + 1} seed={i + 20 + 1} />
              <div>
                <p>{q}</p>
                <div className="lines">
                  <span />
                </div>
              </div>
            </div>
          ))}
        </div>
      </At>
    </Page>
  );
}

function Ending({ c, lang }: Ctx) {
  const t = c.ending;
  return (
    <Page n={28} folio={c.running}>
      <div className="art" style={{ left: 64, top: 80, width: 672 }}>
        <Art.Meeting lang={lang} />
      </div>
      <Hand x={430} y={118} rotate={-3}>
        {t.margin}
      </Hand>
      <At x={64} y={600} w={600}>
        <p className="end-1">{t.line1}</p>
        <p className="end-2">{t.line2}</p>
        <div style={{ margin: "2px 0 0 2px" }}>
          <Underline w={180} seed={17} />
        </div>
        <p style={{ marginTop: 28, maxWidth: 460 }}>{t.body}</p>
      </At>
    </Page>
  );
}

function MeetingPage({ c, lang }: Ctx) {
  const t = c.meeting;
  const b = business;
  const site = b.domain.replace(/^https?:\/\/(www\.)?/, "");
  return (
    <Page n={29} folio={t.title.replace(/\.$/, "")}>
      <At x={80} y={92} w={420}>
        <h1>{t.title}</h1>
        <div style={{ marginTop: 24 }}>
          {t.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </At>
      <div
        className="print-photo"
        style={{ left: 540, top: 96, width: 190, transform: "rotate(2.4deg)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="PORTRAIT" alt={b.name} width={170} height={170} />
      </div>
      <Hand x={566} y={322} rotate={-3} size={24}>
        Bill
      </Hand>
      <At x={80} y={430} w={600}>
        <a className="cta pen-link" href={b.bookingUrl}>
          {t.cta} <span aria-hidden="true">→</span>
        </a>
        <dl className="contact">
          <div>
            <dt>{t.phone}</dt>
            <dd>
              <a href={`tel:${b.tel}`}>{b.phone}</a>
            </dd>
          </div>
          <div>
            <dt>{t.email}</dt>
            <dd>
              <a href={`mailto:${b.email}`}>{b.email}</a>
            </dd>
          </div>
          <div>
            <dt>{t.office}</dt>
            <dd>
              {b.address[lang].replace(
                /([A-Z]\d[A-Z]) (\d[A-Z]\d)/,
                "$1\u00a0$2",
              )}
            </dd>
          </div>
          <div>
            <dt>{t.web}</dt>
            <dd>
              <a href={`${b.domain}/${lang}`}>{site}</a>
            </dd>
          </div>
        </dl>
      </At>
      <At x={80} y={860} w={470}>
        <p className="small">{t.bill}</p>
      </At>
    </Page>
  );
}

function Colophon({ c, lang, final }: Ctx) {
  const t = c.colophon;
  return (
    <Page n={30} folio={c.running}>
      <At x={64} y={84} w={560}>
        <h2>{t.title}</h2>
        <div style={{ marginTop: 18 }}>
          {t.body.map((p) => (
            <p key={p} className="small" style={{ fontSize: 13 }}>
              {p}
            </p>
          ))}
        </div>
      </At>
      <At x={64} y={330} w={672}>
        <p className="kicker">{t.sources}</p>
        <ol className="srcs">
          {sources.map((s) => {
            const url = (lang === "fr" && s.urlFr) || s.url;
            return (
              <li key={s.url}>
                <a href={url}>{s[lang]}</a>
                <span>{url.replace(/^https:\/\/(www\.)?/, "")}</span>
              </li>
            );
          })}
        </ol>
      </At>
      <At x={64} y={final ? 900 : 910} w={600}>
        {final ? (
          <p className="small">{t.disclosure}</p>
        ) : (
          <>
            <p className="draft">{t.draft}</p>
            <p className="draft">{t.todo}</p>
          </>
        )}
      </At>
    </Page>
  );
}

function Notes({ c }: Ctx) {
  return (
    <Page n={31} folio={c.colophon.notes}>
      <At x={80} y={84} w={600}>
        <h2>{c.colophon.notes}</h2>
      </At>
      <At x={80} y={150} w={672}>
        <div className="lines tall">
          {Array.from({ length: 26 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      </At>
    </Page>
  );
}

function Back({ c, lang }: Ctx) {
  const b = business;
  const site = b.domain.replace(/^https?:\/\/(www\.)?/, "");
  return (
    <Page n={32}>
      <div className="art" style={{ left: 228, top: 330, width: 360 }}>
        <Art.BackSailboat lang={lang} />
      </div>
      <At x={128} y={640} w={560} className="back-block">
        <p className="back-name">{b.name}</p>
        <p className="caption" style={{ fontSize: 15 }}>
          {c.back.line}
        </p>
        <p className="back-contact">
          {b.phone} · {site}
        </p>
      </At>
    </Page>
  );
}

export function Guide({
  lang,
  final = false,
}: {
  lang: Language;
  /** The approved edition: no review notes, and the disclosure printed. */
  final?: boolean;
}) {
  const c = copy[lang];
  const ctx = { c, lang, final };
  return (
    <>
      <Cover {...ctx} />
      <Letter {...ctx} />
      <Statement {...ctx} />
      <Opening {...ctx} />
      <TablePlan {...ctx} />
      <Porch {...ctx} />
      <Ch1 {...ctx} />
      <Ch2 {...ctx} />
      <Ch2Plate {...ctx} />
      <Ch3 {...ctx} />
      <Ch3Gap {...ctx} />
      <Ch4a {...ctx} />
      <Ch4b {...ctx} />
      <Storm {...ctx} />
      <Sequence {...ctx} />
      <Ch5 {...ctx} />
      <Ch5Thought {...ctx} />
      <Horizons {...ctx} />
      <Ch6 {...ctx} />
      <Ch7Art {...ctx} />
      <Ch7 {...ctx} />
      <Ch8 {...ctx} />
      <Ch8Chart {...ctx} />
      <Ch9 {...ctx} />
      <Ch9Sheet {...ctx} />
      <Checklist {...ctx} />
      <Questions {...ctx} />
      <Ending {...ctx} />
      <MeetingPage {...ctx} />
      <Colophon {...ctx} />
      <Notes {...ctx} />
      <Back {...ctx} />
    </>
  );
}
