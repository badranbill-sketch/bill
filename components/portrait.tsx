"use client";
import Image from "next/image";
import { useState } from "react";
import { business, type Language } from "@/lib/business";
export function Portrait({
  lang,
  priority = false,
  sizes = "(max-width: 700px) 90vw, 42vw",
}: {
  lang: Language;
  priority?: boolean;
  /** How wide the portrait is drawn, so the browser fetches a fitting file. */
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="portrait-fallback">
      <Image src="/assets/monogram.svg" alt="" width={80} height={100} />
      <p>
        {lang === "fr"
          ? "Portrait temporairement indisponible"
          : "Portrait temporarily unavailable"}
      </p>
      <strong>Bill Badran</strong>
    </div>
  ) : (
    <Image
      src={business.portrait}
      alt="Bill Badran"
      width={960}
      height={960}
      priority={priority}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
