"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { pathFor, type PageKey } from "@/lib/routes";
import type { Language } from "@/lib/business";
import { t } from "@/lib/copy";
export function Navigation({
  lang,
  equivalent,
}: {
  lang: Language;
  equivalent: string;
}) {
  const c = t(lang),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    dialog.current?.close();
    setOpen(false);
    document.body.style.overflow = "";
    opener.current?.focus();
  };
  const links = (
    [
      ["retirement", c.nav.retirement],
      ["investments", c.nav.investments],
      ["ask", c.nav.ask],
      ["about", c.nav.about],
      ["resources", c.nav.guide],
    ] as [PageKey, string][]
  ).map(([key, label]) => (
    <Link
      key={key}
      href={pathFor(lang, key)}
      // Where the header runs short of room, this one steps back first
      // (it is still in the footer and linked from the retirement page).
      className={key === "investments" ? "nav-optional" : undefined}
      onClick={() => {
        if (open) close();
      }}
    >
      {label}
    </Link>
  ));
  return (
    <>
      <nav
        className="desktop-nav"
        aria-label={lang === "fr" ? "Navigation principale" : "Main navigation"}
      >
        {links}
      </nav>
      <Link
        className="language"
        href={equivalent}
        hrefLang={lang === "fr" ? "en-CA" : "fr-CA"}
        lang={lang === "fr" ? "en" : "fr"}
        aria-label={
          lang === "fr"
            ? "EN, view this page in English"
            : "FR, voir cette page en français"
        }
      >
        {lang === "fr" ? "EN" : "FR"}
      </Link>
      <Link className="button header-cta" href={pathFor(lang, "meeting")}>
        {c.shortMeeting}
      </Link>
      <button
        className="menu-button"
        ref={opener}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
          document.body.style.overflow = "hidden";
        }}
      >
        Menu <span aria-hidden="true">☰</span>
      </button>
      <dialog
        ref={dialog}
        id="mobile-menu"
        aria-label={lang === "fr" ? "Menu principal" : "Main menu"}
        className="mobile-menu"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const items = dialog.current?.querySelectorAll<HTMLElement>(
            "a[href],button:not([disabled])",
          );
          if (!items?.length) return;
          const first = items[0],
            last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="menu-top">
          <span>Bill Badran</span>
          <button onClick={close} autoFocus>
            {lang === "fr" ? "Fermer" : "Close"} ×
          </button>
        </div>
        <nav
          aria-label={lang === "fr" ? "Navigation mobile" : "Mobile navigation"}
        >
          {links}
          <Link href={pathFor(lang, "meeting")} onClick={close}>
            {c.meeting}
          </Link>
        </nav>
      </dialog>
    </>
  );
}
