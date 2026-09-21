import { describe, expect, it } from "vitest";
import { PersonRequest, PersonResponse } from "../src/v1/person";

const nullablePerson = {
  external_id: null,
  email: null,
  name: null,
  locale: null,
  plan: null,
  subscription_status: null,
  last_seen_at: null,
};

describe("PersonRequest", () => {
  it("accepts nullable real-world fields", () => {
    expect(PersonRequest.parse(nullablePerson)).toEqual(nullablePerson);
  });

  it("requires fields even when their values may be null", () => {
    const { external_id: _externalId, ...missingExternalId } = nullablePerson;

    expect(PersonRequest.safeParse(missingExternalId).success).toBe(false);
  });

  it("accepts a populated person", () => {
    const person = {
      external_id: "customer-user-42",
      email: "ada@example.com",
      name: "Ada Lovelace",
      locale: "en-GB",
      plan: "pro",
      subscription_status: "active",
      last_seen_at: "2026-09-03T12:30:00.000Z",
    };

    expect(PersonRequest.parse(person)).toEqual(person);
  });

  it.each([
    ["malformed email", { ...nullablePerson, email: "not-an-email" }],
    ["malformed timestamp", { ...nullablePerson, last_seen_at: "yesterday" }],
  ])("rejects %s", (_case, person) => {
    expect(PersonRequest.safeParse(person).success).toBe(false);
  });

  it("strips tenant and system-managed fields", () => {
    const parsed = PersonRequest.parse({
      ...nullablePerson,
      community_id: "550e8400-e29b-41d4-a716-446655440000",
      attributes: { goal: "retention" },
      unsubscribed_at: "2026-09-03T12:30:00.000Z",
      deleted_at: "2026-09-03T12:30:00.000Z",
    });

    expect(parsed).toEqual(nullablePerson);
    expect(parsed).not.toHaveProperty("community_id");
    expect(parsed).not.toHaveProperty("attributes");
    expect(parsed).not.toHaveProperty("unsubscribed_at");
    expect(parsed).not.toHaveProperty("deleted_at");
  });
});

describe("PersonResponse", () => {
  it("requires a UUID id and ISO created_at", () => {
    const response = {
      ...nullablePerson,
      id: "550e8400-e29b-41d4-a716-446655440000",
      created_at: "2026-09-03T12:30:00.000Z",
    };

    expect(PersonResponse.parse(response)).toEqual(response);
    expect(
      PersonResponse.safeParse({ ...response, id: "person-1" }).success,
    ).toBe(false);
    expect(
      PersonResponse.safeParse({ ...response, created_at: "today" }).success,
    ).toBe(false);
  });
});
