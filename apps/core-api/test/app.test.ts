import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { AppLogger } from "../src/lib/logger";
import type { TokenVerifier } from "../src/middleware/session";

function testDependencies(verifyToken: TokenVerifier = async () => null) {
  const info = vi.fn();
  const error = vi.fn();

  return {
    deps: {
      verifyToken,
      logger: {
        info: info as unknown as AppLogger["info"],
        error: error as unknown as AppLogger["error"],
      },
    },
    spies: { error, info },
  };
}

describe("core app", () => {
  it("returns a bare health response without authenticating", async () => {
    const verifyToken = vi.fn<TokenVerifier>();
    const { deps } = testDependencies(verifyToken);
    const app = createApp(deps);

    const response = await app.request("/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(body).not.toHaveProperty("ok");
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("returns the shared not-found envelope", async () => {
    const verifyToken = vi
      .fn<TokenVerifier>()
      .mockResolvedValue("verified-user");
    const { deps } = testDependencies(verifyToken);
    const app = createApp(deps);

    const response = await app.request("/missing", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
  });

  it("rejects a missing or malformed bearer token", async () => {
    const verifyToken = vi.fn<TokenVerifier>();
    const { deps } = testDependencies(verifyToken);
    const app = createApp(deps);
    app.get("/whoami", (c) => c.json({ userId: c.get("userId") }));

    const missing = await app.request("/whoami");
    const malformed = await app.request("/whoami", {
      headers: { Authorization: "Basic credentials" },
    });

    expect(missing.status).toBe(401);
    expect(malformed.status).toBe(401);
    expect(await missing.json()).toEqual({
      ok: false,
      error: { code: "unauthorized" },
    });
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("rejects a token that does not verify", async () => {
    const verifyToken = vi.fn<TokenVerifier>().mockResolvedValue(null);
    const { deps } = testDependencies(verifyToken);
    const app = createApp(deps);
    app.get("/whoami", (c) => c.json({ userId: c.get("userId") }));

    const response = await app.request("/whoami", {
      headers: { Authorization: "Bearer rejected-token" },
    });

    expect(response.status).toBe(401);
    expect(verifyToken).toHaveBeenCalledWith("rejected-token");
  });

  it("sets the verified user id", async () => {
    const verifyToken = vi
      .fn<TokenVerifier>()
      .mockResolvedValue("verified-user");
    const { deps } = testDependencies(verifyToken);
    const app = createApp(deps);
    app.get("/whoami", (c) => c.json({ userId: c.get("userId") }));

    const response = await app.request("/whoami", {
      headers: { Authorization: "Bearer valid-token" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: "verified-user" });
    expect(verifyToken).toHaveBeenCalledWith("valid-token");
  });

  it("masks unexpected errors and logs structured context", async () => {
    const verifyToken = vi
      .fn<TokenVerifier>()
      .mockResolvedValue("verified-user");
    const { deps, spies } = testDependencies(verifyToken);
    const app = createApp(deps);
    app.get("/explode", () => {
      throw new Error("database password leaked");
    });

    const response = await app.request("/explode", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: { code: "internal_error" },
    });
    expect(JSON.stringify(body)).not.toContain("database password leaked");
    expect(spies.error).toHaveBeenCalledOnce();
    expect(spies.error.mock.calls[0]?.[0]).toMatchObject({
      event: "unhandled_error",
      method: "GET",
      path: "/explode",
    });
    expect(spies.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "http_request",
        path: "/explode",
        status: 500,
      }),
      "request completed",
    );
  });

  it("reports database time on every request log", async () => {
    const { deps, spies } = testDependencies();
    const app = createApp(deps);

    await app.request("/health");

    expect(spies.info).toHaveBeenCalledWith(
      expect.objectContaining({ db_ms: 0, db_queries: 0 }),
      "request completed",
    );
  });
});
