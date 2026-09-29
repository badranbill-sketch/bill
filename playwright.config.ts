import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 7000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run start -- --port 3100",
      port: 3100,
      reuseExistingServer: false,
      env: {
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
    {
      command: "npm run start -- --port 3101",
      port: 3101,
      reuseExistingServer: false,
      env: {
        LOCAL_REVIEW: "false",
        REVIEW_USER: "review-test",
        REVIEW_PASSWORD: "test-only-password",
        REVIEW_ENABLED: "false",
        PUBLIC_LAUNCH: "false",
        ENABLE_CONTACT: "false",
      },
    },
  ],
});
