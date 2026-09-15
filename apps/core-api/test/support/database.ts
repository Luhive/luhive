import { createNodeClient, type NodeClient } from "@luhive/db/node";
import type { Transaction } from "kysely";
import type { DB } from "@luhive/db";

/**
 * Service tests run real SQL against the disposable validation project, never
 * production. `DATABASE_URL` is deliberately not consulted: the write target
 * has to be named explicitly, the same rule `packages/db` enforces for
 * migrations.
 */
function resolveTestUrl(): string {
  const validation = process.env.VALIDATION_DATABASE_URL;
  if (!validation) {
    throw new Error(
      "VALIDATION_DATABASE_URL is not set. Database tests only run against the disposable validation project.",
    );
  }

  for (const name of ["DATABASE_URL", "PRODUCTION_DATABASE_URL"] as const) {
    if (process.env[name]?.trim() === validation.trim()) {
      throw new Error(
        `VALIDATION_DATABASE_URL equals ${name}. Refusing to run tests against it.`,
      );
    }
  }

  return validation;
}

let client: NodeClient | undefined;

/**
 * One pool per worker. `vitest.integration.config.ts` disables file
 * parallelism, so this is one pool per run against a remote database with a
 * finite connection limit.
 */
export function testDb(): NodeClient {
  client ??= createNodeClient({
    connectionString: resolveTestUrl(),
    max: 2,
    connectionTimeoutMillis: 15_000,
  });

  return client;
}

export async function closeTestDb(): Promise<void> {
  await client?.destroy();
  client = undefined;
}

class Rollback extends Error {
  readonly result: unknown;

  constructor(result: unknown) {
    super("rollback");
    this.result = result;
  }
}

/**
 * Kysely rolls a transaction back by throwing, so the sentinel carries the
 * result out and is swallowed here. Nothing a test writes is ever committed.
 */
export async function inRolledBackTx<T>(
  run: (tx: Transaction<DB>) => Promise<T>,
): Promise<T> {
  try {
    await testDb()
      .transaction()
      .execute(async (tx) => {
        throw new Rollback(await run(tx));
      });
  } catch (error) {
    if (error instanceof Rollback) return error.result as T;
    throw error;
  }

  throw new Error("transaction committed: the rollback sentinel was swallowed");
}
