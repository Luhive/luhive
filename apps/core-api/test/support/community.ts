import { sql, type Transaction } from "kysely";
import type { DB } from "@luhive/db";
import { testExternalId } from "./fixtures";

/** `communities.created_by` references `auth.users`, so borrow an existing user. */
export async function createTestCommunity(transaction: Transaction<DB>): Promise<string> {
  const creator = await sql<{ id: string }>`select id from auth.users limit 1`.execute(transaction);
  const creatorId = creator.rows[0]?.id;
  if (creatorId === undefined) throw new Error("validation has no auth.users row to own a community");

  const slug = testExternalId("community");
  const community = await transaction
    .insertInto("communities")
    .values({ name: slug, slug, created_by: creatorId })
    .returning("id")
    .executeTakeFirstOrThrow();
  return community.id;
}
