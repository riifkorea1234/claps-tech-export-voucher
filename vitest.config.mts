import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const serverOnly = fileURLToPath(new URL("./tests/server-only.ts", import.meta.url));
export default defineConfig({
  test: {
    projects: ["unit", "integration", "i18n"].map((name) => ({
      resolve: { alias: { "server-only": serverOnly, "@": fileURLToPath(new URL("./", import.meta.url)) } },
      test: {
        name, environment: "node", include: [`tests/${name}/**/*.test.ts`],
        passWithNoTests: false, testTimeout: 15_000, hookTimeout: 30_000,
        ...(name === "integration" ? { fileParallelism: false } : {}),
      },
    })),
  },
});
