/**
 * BASE02 capture config (F03). Starts a local production server (`next start`, after `npm run build`) and runs
 * tests/baseline/screens.spec.ts only. The default e2e config (playwright.config.ts) is not touched.
 *
 * Environment:
 * - BASE02_APP_DIR  app checkout to serve (default: this repository). Used to capture a "before" tree with the
 *                   same spec; that tree must already have a production build (.next) and node_modules.
 * - BASE02_OUT      output directory for screenshots and records (default: test-results/baseline/base02).
 * - BASE02_PORT     server port (default 3200; the e2e config uses 3100 and 3101).
 * - PLAYWRIGHT_CHROMIUM_EXECUTABLE  browser override, as in playwright.config.ts.
 *
 * The server env copies the review-mode values of playwright.config.ts (first server): test-only placeholders,
 * no real credentials, public launch off. The contact form renders but cannot send (the provider URLs are dead).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const appDir = process.env.BASE02_APP_DIR
  ? path.resolve(process.env.BASE02_APP_DIR)
  : root;
const out = process.env.BASE02_OUT
  ? path.resolve(process.env.BASE02_OUT)
  : path.join(root, "test-results", "baseline", "base02");
const port = Number(process.env.BASE02_PORT || 3200);

export default defineConfig({
  testDir: here,
  testMatch: "screens.spec.ts",
  outputDir: path.join(out, "pw-output"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 10000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
    // Deterministic captures: reveals and the ride render as still panels (components/reveal.tsx,
    // components/journey/ride.tsx honour prefers-reduced-motion).
    reducedMotion: "reduce",
    colorScheme: "light",
    locale: "en-CA",
    timezoneId: "America/Toronto",
    deviceScaleFactor: 1,
    trace: "off",
    screenshot: "off",
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    cwd: appDir,
    port,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      LOCAL_REVIEW: "true",
      ENABLE_CONTACT: "true",
      RESEND_API_KEY: "test-only-not-valid",
      MAIL_FROM: "nobody@example.invalid",
      UPSTASH_REDIS_REST_URL: "http://127.0.0.1:9",
      UPSTASH_REDIS_REST_TOKEN: "test-only",
      RATE_LIMIT_SALT: "test-only-salt",
      TRUST_PROXY_IP: "true",
      PUBLIC_LAUNCH: "false",
    },
  },
});
