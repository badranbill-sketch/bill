import fs from "node:fs";
import { business } from "../lib/business";
import { contactConfigured } from "../lib/contact";
const missing = Object.entries(business.approvals)
  .filter(([, ok]) => !ok)
  .map(([key]) => key);
if (!fs.existsSync("public" + business.portrait))
  missing.push("portrait asset");
for (const [lang, pdf] of Object.entries(business.guide.pdf)) {
  if (pdf && (!pdf.approved || !fs.existsSync("public" + pdf.path)))
    missing.push(`guide PDF ${lang}`);
}
if (process.env.ENABLE_CONTACT === "true" && !contactConfigured())
  missing.push("contact credentials and trusted proxy");
if (business.newsletterEnabled)
  missing.push("newsletter not implemented; keep disabled");
if (business.analyticsEnabled)
  missing.push("analytics consent and adapter not configured; keep disabled");
if (process.env.PUBLIC_LAUNCH === "true" || process.argv.includes("--strict")) {
  if (missing.length) {
    console.error("Launch blocked: " + missing.join(", "));
    process.exit(1);
  }
  console.log(
    "Launch configuration checks passed. Owner authorization is still required.",
  );
} else
  console.log(
    "Review build; public launch is off. Pending approvals: " +
      missing.join(", "),
  );
