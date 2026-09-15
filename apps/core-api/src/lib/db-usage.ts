import { AsyncLocalStorage } from "node:async_hooks";

export type DbUsage = {
  queries: number;
  ms: number;
};

/**
 * The Kysely client is one process-wide instance, so its log callback has no
 * idea which request a query belongs to. Async context is what connects the
 * two without threading a collector through every service signature.
 */
const storage = new AsyncLocalStorage<DbUsage>();

export function trackDbUsage<T>(run: (usage: DbUsage) => Promise<T>): Promise<T> {
  const usage: DbUsage = { queries: 0, ms: 0 };
  return storage.run(usage, () => run(usage));
}

/**
 * Called for every query. Outside a request — startup checks, scheduled jobs —
 * there is no store and nothing to attribute the query to.
 */
export function recordQuery(durationMs: number): void {
  const usage = storage.getStore();
  if (!usage) return;

  usage.queries += 1;
  usage.ms += durationMs;
}
