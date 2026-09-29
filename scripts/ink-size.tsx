/**
 * Markup size of each illustration a module exports, to keep drawings
 * within the size budget in docs/ART-DIRECTION.md.
 *
 *   node --import tsx scripts/ink-size.tsx components/ink/vignettes.tsx [Export…]
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const [file, ...names] = process.argv.slice(2);
if (!file) {
  console.error("usage: ink-size.tsx <module> [Export…]");
  process.exit(1);
}
const mod = (await import(pathToFileURL(path.resolve(file)).href)) as Record<
  string,
  unknown
>;
const picks = names.length
  ? names
  : Object.keys(mod).filter(
      (k) => typeof mod[k] === "function" && /^[A-Z]/.test(k),
    );
for (const name of picks) {
  const Comp = mod[name] as ComponentType<Record<string, unknown>>;
  for (const lang of ["fr", "en"]) {
    try {
      const html = renderToStaticMarkup(createElement(Comp, { lang }));
      console.log(
        `${name.padEnd(20)} ${lang}  ${(html.length / 1024).toFixed(1)} KB`,
      );
    } catch (e) {
      console.log(`${name.padEnd(20)} ${lang}  (not renderable alone: ${e})`);
    }
  }
}
