import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Existing browser-store hydration debt: keep visible until the owning UI/API Phases migrate these screens.
  // This override is intentionally limited to the existing files; new server/contracts/tests retain strict rules.
  {
    files: [
      "app/(app)/monitoring/\\[id\\]/page-content.tsx",
      "app/(app)/monitoring/page-content.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
