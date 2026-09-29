import Link from "next/link";
import Image from "next/image";
import { business, type Language } from "@/lib/business";
import { pathFor } from "@/lib/routes";
import { t } from "@/lib/copy";
import { Navigation } from "./navigation";
export function Header({
  lang,
  equivalent,
}: {
  lang: Language;
  equivalent: string;
}) {
  const c = t(lang);
  return (
    <>
      <a className="skip" href="#main">
        {c.skip}
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link
            href={pathFor(lang, "home")}
            className="brand"
            aria-label={
              lang === "fr" ? "Bill Badran, accueil" : "Bill Badran, home"
            }
          >
            <Image src="/assets/monogram.svg" width={54} height={48} alt="" />
            <b>Bill Badran</b>
          </Link>
          <Navigation lang={lang} equivalent={equivalent} />
        </div>
      </header>
    </>
  );
}
export function Footer({ lang }: { lang: Language }) {
  const c = t(lang);
  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Image src="/assets/monogram.svg" width={70} height={62} alt="" />
            <p className="footer-statement">{c.footer}</p>
          </div>
          <div>
            <h2>
              {c.phone} {lang === "fr" ? "et" : "and"} {c.email.toLowerCase()}
            </h2>
            <a href={`tel:${business.tel}`}>{business.phone}</a>
            <a href={`mailto:${business.email}`}>{business.email}</a>
          </div>
          <div>
            <h2>{c.office}</h2>
            <p>{business.address[lang]}</p>
          </div>
          <div>
            <h2>{lang === "fr" ? "Explorer" : "Explore"}</h2>
            <Link href={pathFor(lang, "retirement")}>{c.nav[0]}</Link>
            <Link href={pathFor(lang, "investments")}>{c.nav[1]}</Link>
            <Link href={pathFor(lang, "meeting")}>{c.nav[2]}</Link>
            <Link href={pathFor(lang, "about")}>{c.nav[3]}</Link>
            <Link href={pathFor(lang, "resources")}>{c.nav[4]}</Link>
            <Link href={pathFor(lang, "privacy")}>{c.privacy}</Link>
            <Link href={pathFor(lang, "legal")}>{c.legal}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {business.name}
          </p>
          <p>{c.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
export function MeetingLink({ lang }: { lang: Language }) {
  return (
    <Link className="button" href={pathFor(lang, "meeting")}>
      {t(lang).meeting}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
