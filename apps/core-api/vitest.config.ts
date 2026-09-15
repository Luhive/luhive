import { defineConfig } from "vitest/config";

/**
 * The fast suite. Database tests live in `*.db.test.ts` and run from
 * `vitest.integration.config.ts`, so `pnpm test` needs no connection string.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/**/*.db.test.ts"],
  },
});
