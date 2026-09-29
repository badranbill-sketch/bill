import Image from "next/image";
import files from "@/lib/ink-files.json";
import type { Language } from "@/lib/business";

export type InkName = keyof typeof files;

/**
 * A static drawing, served as a cached file. scripts/build-ink.tsx writes
 * the files to public/assets/ink/ from the components in this folder, so
 * the drawing is not sent twice inline (HTML and React payload) and is
 * loaded only when it comes near the screen.
 */
export function InkFile({
  name,
  lang,
  priority = false,
  className,
}: {
  name: InkName;
  lang: Language;
  /** Above the fold: fetch it with the page. */
  priority?: boolean;
  className?: string;
}) {
  const f = files[name];
  return (
    <Image
      className={className ? `ink-art ${className}` : "ink-art"}
      src={`/assets/ink/${f.files[lang]}`}
      width={f.w}
      height={f.h}
      alt={f.alt[lang]}
      priority={priority}
      unoptimized
    />
  );
}
