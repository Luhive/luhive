import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { afterAll, describe, expect, it } from "vitest";
import { closeTestDb, inRolledBackTx, testDb } from "./support/database";

afterAll(closeTestDb);

describe("validation database harness", () => {
  it("reaches the database", async () => {
    const { rows } = await sql<{
      one: number;
    }>`select 1 as one`.execute(testDb());

    expect(rows[0]?.one).toBe(1);
  });

  it("has the schema the slices depend on", async () => {
    const { rows } = await sql<{ name: string }>`
      select name from public.kysely_migration order by name
    `.execute(testDb());

    expect(rows.map((row) => row.name)).toEqual(
      expect.arrayContaining(["0000_baseline", "0001_add_people_schema"]),
    );
  });

  it("returns a value out of a transaction that is rolled back", async () => {
    const table = `harness_${randomUUID().replaceAll("-", "")}`;

    const returned = await inRolledBackTx(async (tx) => {
      await sql`create table ${sql.id(table)} (id int)`.execute(tx);
      return "carried out of the transaction";
    });

    expect(returned).toBe("carried out of the transaction");

    const { rows } = await sql<{ present: boolean }>`
      select to_regclass(${table}) is not null as present
    `.execute(testDb());

    expect(rows[0]?.present).toBe(false);
  });
});
