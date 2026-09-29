import Link from "next/link";
import type { Language } from "@/lib/business";
import { pathFor } from "@/lib/routes";
import { t } from "@/lib/copy";
export function MeetingLink({ lang }: { lang: Language }) {
  return (
    <Link className="button" href={pathFor(lang, "meeting")}>
      {t(lang).meeting}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
