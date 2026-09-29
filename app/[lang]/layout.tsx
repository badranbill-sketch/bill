import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { InkDefs } from "@/components/ink/primitives";
import "../globals.css";
import "../ink.css";
import "../ride.css";

/* Editorial serif for headlines. */
const serif = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/newsreader/files/newsreader-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/newsreader/files/newsreader-latin-300-italic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../node_modules/@fontsource/newsreader/files/newsreader-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
});
/* Humanist sans for reading, navigation, labels and forms. */
const sans = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-source-sans",
  display: "swap",
});
/* Bill's handwriting, for margin notes only. */
const hand = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/caveat/files/caveat-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-caveat",
  display: "swap",
  // A few margin notes, never above the fold: not worth a preload.
  preload: false,
});

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (lang !== "fr" && lang !== "en") notFound();
  return (
    <html
      lang={`${lang}-CA`}
      className={`${serif.variable} ${sans.variable} ${hand.variable}`}
    >
      <body>
        <InkDefs />
        {children}
      </body>
    </html>
  );
}
