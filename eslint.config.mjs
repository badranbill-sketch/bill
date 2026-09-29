import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
const config = [
  ...next,
  ...ts,
  {
    ignores: [
      ".next/**",
      "reference/**",
      "test-results/**",
      "playwright-report/**",
      // The standalone Remotion project has its own ESLint config and dependencies.
      "film/**",
    ],
  },
];

export default config;
