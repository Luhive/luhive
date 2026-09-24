import { sql, type Transaction } from "kysely";
import type { DB } from "@luhive/db";
import { afterAll, describe, expect, it } from "vitest";
import { recordPersonEvent } from "../src/lib/person-event";
import { resolvePerson } from "../src/lib/person";
import { closeTestDb, inRolledBackTx } from "./support/database";
import { testEmail, testExternalId } from "./support/fixtures";

afterAll(closeTestDb);

/** `communities.created_by` references `auth.users`, so borrow an existing user. */
async function createTestCommunity(transaction: Transaction<DB>) {
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

async function createTestPerson(transaction: Transaction<DB>, community_id: string) {
  const result = await resolvePerson(transaction, {
    community_id,
    external_id: testExternalId("person"),
    email: testEmail("person"),
    name: "Test Person",
  });
  if (!result.ok) throw new Error(result.error.code);
  return result.data;
}

describe("resolvePerson", () => {
  it("returns the same person on a second call", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const person = await createTestPerson(transaction, communityId);

      const again = await resolvePerson(transaction, {
        community_id: communityId,
        external_id: person.external_id,
        email: null,
        name: null,
      });

      expect(again).toMatchObject({ ok: true, data: { id: person.id, name: "Test Person" } });
    });
  });

  it("lowercases and trims email", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const email = testEmail("case");

      const result = await resolvePerson(transaction, {
        community_id: communityId,
        external_id: null,
        email: `  ${email.toUpperCase()} `,
        name: null,
      });

      expect(result).toMatchObject({ ok: true, data: { email } });
    });
  });

  it("gives an anonymous person the account's external id", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const email = testEmail("anonymous");
      const externalId = testExternalId("account");

      const anonymous = await resolvePerson(transaction, { community_id: communityId, external_id: null, email, name: null });
      const account = await resolvePerson(transaction, { community_id: communityId, external_id: externalId, email, name: null });

      expect(anonymous.ok && account.ok && account.data.id === anonymous.data.id).toBe(true);
      expect(account).toMatchObject({ ok: true, data: { external_id: externalId } });
    });
  });

  it("returns conflict when the email belongs to another account", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const person = await createTestPerson(transaction, communityId);

      const result = await resolvePerson(transaction, {
        community_id: communityId,
        external_id: testExternalId("other"),
        email: person.email,
        name: null,
      });

      expect(result).toMatchObject({ ok: false, error: { code: "conflict" } });
    });
  });

  it("returns conflict when the external id and the email belong to two different people", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const personWithExternalId = await createTestPerson(transaction, communityId);
      const personWithEmail = await createTestPerson(transaction, communityId);

      const result = await resolvePerson(transaction, {
        community_id: communityId,
        external_id: personWithExternalId.external_id,
        email: personWithEmail.email,
        name: null,
      });

      expect(result).toMatchObject({ ok: false, error: { code: "conflict" } });
    });
  });

  it("does not clear unsubscribed_at or deleted_at", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const person = await createTestPerson(transaction, communityId);
      const stamped = new Date("2026-01-01T00:00:00Z");
      await transaction
        .updateTable("people")
        .set({ unsubscribed_at: stamped, deleted_at: stamped })
        .where("id", "=", person.id)
        .execute();

      const again = await resolvePerson(transaction, {
        community_id: communityId,
        external_id: person.external_id,
        email: person.email,
        name: null,
      });

      expect(again).toMatchObject({
        ok: true,
        data: { unsubscribed_at: stamped, deleted_at: stamped },
      });
    });
  });
});

describe("recordPersonEvent", () => {
  it("inserts the event", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const person = await createTestPerson(transaction, communityId);

      const result = await recordPersonEvent(transaction, {
        person_id: person.id,
        community_id: communityId,
        type: "community_joined",
      });

      expect(result).toMatchObject({ ok: true, data: { person_id: person.id, type: "community_joined" } });
    });
  });

  it("returns forbidden for a person from another community", async () => {
    await inRolledBackTx(async (transaction) => {
      const person = await createTestPerson(transaction, await createTestCommunity(transaction));

      const result = await recordPersonEvent(transaction, {
        person_id: person.id,
        community_id: await createTestCommunity(transaction),
        type: "community_joined",
      });

      expect(result).toMatchObject({ ok: false, error: { code: "forbidden" } });
    });
  });

  it("rejects identity fields in properties", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const person = await createTestPerson(transaction, communityId);

      const result = await recordPersonEvent(transaction, {
        person_id: person.id,
        community_id: communityId,
        type: "event_registered",
        properties: { event_id: "e1", email: "someone@example.com" },
      });

      expect(result).toMatchObject({ ok: false, error: { code: "invalid_query" } });
    });
  });
});
