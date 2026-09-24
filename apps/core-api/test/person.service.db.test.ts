import { afterAll, describe, expect, it } from "vitest";
import { PersonService } from "../src/slices/people/person.service";
import { createTestCommunity } from "./support/community";
import { closeTestDb, inRolledBackTx } from "./support/database";
import { testEmail, testExternalId } from "./support/fixtures";

afterAll(closeTestDb);

describe("PersonService.upsert", () => {
  it("returns the person as the wire shape, with ISO dates and no internal columns", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const people = new PersonService({ db: transaction });
      const externalId = testExternalId("service");

      const result = await people.upsert({
        communityId,
        external_id: externalId,
        email: testEmail("service"),
        name: "Ada",
        locale: "az",
        plan: "pro",
        subscription_status: "active",
        last_seen_at: "2026-06-01T00:00:00.000Z",
      });

      if (!result.ok) throw new Error(result.error.code);
      expect(result.data).toMatchObject({
        external_id: externalId,
        plan: "pro",
        last_seen_at: "2026-06-01T00:00:00.000Z",
        created_at: expect.any(String),
      });
      expect(result.data).not.toHaveProperty("community_id");
    });
  });

  it("returns conflict when the email is linked to a different account", async () => {
    await inRolledBackTx(async (transaction) => {
      const communityId = await createTestCommunity(transaction);
      const people = new PersonService({ db: transaction });
      const email = testEmail("taken");
      const person = {
        communityId,
        email,
        name: null,
        locale: null,
        plan: null,
        subscription_status: null,
        last_seen_at: null,
      };

      await people.upsert({ ...person, external_id: testExternalId("first") });
      const result = await people.upsert({ ...person, external_id: testExternalId("second") });

      expect(result).toMatchObject({ ok: false, error: { code: "conflict" } });
    });
  });
});
