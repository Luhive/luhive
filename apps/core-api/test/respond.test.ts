import { Result, type ErrorCode } from "@luhive/domain";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { respond } from "../src/lib/respond";

describe("respond", () => {
  it.each([
    ["unauthorized", 401],
    ["forbidden", 403],
    ["insufficient_scope", 403],
    ["invalid_query", 400],
    ["not_found", 404],
    ["conflict", 409],
    ["internal_error", 500],
  ] satisfies Array<[ErrorCode, number]>)(
    "maps %s to HTTP %i",
    async (code, expectedStatus) => {
      const app = new Hono();
      app.get("/", (c) => respond(c, Result.failure(code)));

      const response = await app.request("/");

      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toEqual({
        ok: false,
        error: { code },
      });
    },
  );

  it("returns a success unchanged with status 200 by default", async () => {
    const app = new Hono();
    app.get("/", (c) => respond(c, Result.success({ id: "person-1" })));

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { id: "person-1" },
    });
  });

  it("accepts a route-specific success status", async () => {
    const app = new Hono();
    app.post("/", (c) => respond(c, Result.success({ id: "person-1" }), 201));

    const response = await app.request("/", { method: "POST" });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ok: true,
      data: { id: "person-1" },
    });
  });
});
