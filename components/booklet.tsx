import Image from "next/image";
import type { Language } from "@/lib/business";
import { t } from "@/lib/copy";
import { InkFile } from "./ink/file";

/**
 * The cover of Bill's small printed guide, drawn with the page's own type:
 * ivory paper, navy ink, the sunrise mark, one pen drawing and a lot of
 * empty paper. It reads as one picture, so assistive technology gets its
 * title in one label rather than a heading in the middle of the page.
 */
export function Booklet({
  lang,
  priority = false,
}: {
  lang: Language;
  priority?: boolean;
}) {
  const b = t(lang).booklet;
  return (
    <div
      className="booklet"
      role="img"
      aria-label={`${b.coverTitle}. ${b.coverSubtitle} ${b.coverAuthor}`}
    >
      <div className="booklet-cover" aria-hidden="true">
        <Image
          className="booklet-mark"
          src="/assets/monogram.svg"
          width={44}
          height={39}
          alt=""
        />
        <p className="booklet-title">{b.coverTitle}</p>
        <p className="booklet-subtitle">{b.coverSubtitle}</p>
        <div className="booklet-art">
          <InkFile name="path" lang={lang} priority={priority} />
        </div>
        <p className="booklet-author">{b.coverAuthor}</p>
      </div>
    </div>
  );
}
