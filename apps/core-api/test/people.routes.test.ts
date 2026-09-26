import { Result } from "@luhive/domain";
import type { PersonRequest, PersonResponse } from "@luhive/domain/v1/person";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { describe, expect, it, vi } from "vitest";
import type { CommunityEnv } from "../src/context";
import { sessionMiddleware } from "../src/middleware/session";
import { createPeopleRoutes } from "../src/slices/people/routes";
import type { PersonService } from "../src/slices/people/person.service";

const communityId = "7a0e7a4e-5d3b-4c7f-9a51-1f6c2f0b8d11";

const request: PersonRequest = {
  external_id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  locale: null,
  plan: null,
  subscription_status: null,
  last_seen_at: null,
};

const response: PersonResponse = {
  ...request,
  id: "3f1c9e0a-2b4d-4e6f-8a1b-9c0d2e3f4a5b",
  created_at: "2026-09-24T00:00:00.000Z",
};

/** Stands in for the credential middleware that will resolve a community. */
const setCommunity = createMiddleware<CommunityEnv>(async (c, next) => {
  c.set("communityId", communityId);
  await next();
});

function createTestApp(upsert: PersonService["upsert"]) {
  return new Hono<CommunityEnv>()
    .use("*", sessionMiddleware(async (token) => (token === "valid-token" ? "user-1" : null)))
    .use("*", setCommunity)
    .route("/people", createPeopleRoutes({ upsert }));
}

function postPerson(app: ReturnType<typeof createTestApp>, body: unknown, token = "valid-token") {
  return app.request("/people", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /people", () => {
  it("rejects a request without a valid bearer token", async () => {
    const upsert = vi.fn<PersonService["upsert"]>();
    const app = createTestApp(upsert);

    const result = await postPerson(app, request, "wrong-token");

    expect(result.status).toBe(401);
    expect(await result.json()).toEqual({ ok: false, error: { code: "unauthorized" } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns invalid_query with the failing fields", async () => {
    const upsert = vi.fn<PersonService["upsert"]>();
    const app = createTestApp(upsert);

    const result = await postPerson(app, { ...request, email: "not-an-email" });

    expect(result.status).toBe(400);
    expect(await result.json()).toMatchObject({
      ok: false,
      error: { code: "invalid_query", fields: [{ path: "email" }] },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("takes the community from the credential, never from the body", async () => {
    const upsert = vi.fn<PersonService["upsert"]>().mockResolvedValue(Result.success(response));
    const app = createTestApp(upsert);

    await postPerson(app, {
      ...request,
      communityId: "00000000-0000-4000-8000-000000000000",
      community_id: "00000000-0000-4000-8000-000000000000",
    });

    expect(upsert).toHaveBeenCalledWith({ ...request, communityId });
  });

  it("returns the person in the success envelope", async () => {
    const upsert = vi.fn<PersonService["upsert"]>().mockResolvedValue(Result.success(response));
    const app = createTestApp(upsert);

    const result = await postPerson(app, request);

    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true, data: response });
  });

  it("returns a service conflict as 409 with its code", async () => {
    const upsert = vi
      .fn<PersonService["upsert"]>()
      .mockResolvedValue(Result.failure("conflict", { message: "email is linked to a different person" }));
    const app = createTestApp(upsert);

    const result = await postPerson(app, request);

    expect(result.status).toBe(409);
    expect(await result.json()).toMatchObject({ ok: false, error: { code: "conflict" } });
  });
});
