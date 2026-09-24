import type { Kysely, Transaction } from "kysely";
import type { DB } from "@luhive/db";

/**
 * Joins the caller's transaction when there already is one. Kysely throws on a
 * nested `.transaction()`, and service tests run inside a rolled-back one.
 */
export function runInTransaction<T>(
  db: Kysely<DB>,
  work: (transaction: Transaction<DB>) => Promise<T>,
): Promise<T> {
  if (db.isTransaction) return work(db as Transaction<DB>);
  return db.transaction().execute(work);
}
