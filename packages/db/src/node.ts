import { Kysely, type KyselyConfig, PostgresDialect } from "kysely";
import { Pool, type PoolConfig } from "pg";
import type { DB } from "./db.types";

/**
 * Builds a Node-only Kysely client. The returned instance owns the `pg` pool;
 * call `await db.destroy()` to release it.
 *
 * `log` receives every query and query error, including
 * `queryDurationMillis`. Note that Kysely times execution on an
 * already-acquired connection, so it excludes pool wait and connection setup.
 */
export function createNodeClient(
  config: PoolConfig,
  log?: KyselyConfig["log"],
) {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool(config),
    }),
    log,
  });
}

export type NodeClient = Kysely<DB>;
