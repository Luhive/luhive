import { defineConfig } from "vitest/config";

/**
 * Service tests against the validation project, which is a remote Supabase
 * database in Frankfurt. Every query is a ~100 ms round trip from a CI runner,
 * hence the raised timeouts.
 *
 * `fileParallelism: false` keeps this to one pool and a predictable connection
 * count against a database with a finite limit.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.db.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
