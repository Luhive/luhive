import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env";

const requiredEnv = {
  DATABASE_URL: "postgresql://user:password@db.example.com:6543/postgres",
  SUPABASE_URL: "https://project-ref.supabase.co",
  SUPABASE_ANON_KEY: "a".repeat(20),
};

describe("parseEnv", () => {
  it("parses required values and applies safe defaults", () => {
    expect(parseEnv(requiredEnv)).toEqual({
      ...requiredEnv,
      PORT: 3000,
      NODE_ENV: "development",
      LOG_LEVEL: "info",
      DB_POOL_MAX: 5,
    });
  });

  it("coerces valid numeric configuration", () => {
    expect(
      parseEnv({
        ...requiredEnv,
        PORT: "8080",
        DB_POOL_MAX: "3",
        NODE_ENV: "production",
        LOG_LEVEL: "warn",
      }),
    ).toMatchObject({
      PORT: 8080,
      DB_POOL_MAX: 3,
      NODE_ENV: "production",
      LOG_LEVEL: "warn",
    });
  });

  it.each([
    ["missing database URL", { ...requiredEnv, DATABASE_URL: undefined }],
    ["invalid Supabase URL", { ...requiredEnv, SUPABASE_URL: "not-a-url" }],
    ["short anon key", { ...requiredEnv, SUPABASE_ANON_KEY: "short" }],
    ["zero pool size", { ...requiredEnv, DB_POOL_MAX: "0" }],
    ["oversized pool", { ...requiredEnv, DB_POOL_MAX: "11" }],
    ["invalid port", { ...requiredEnv, PORT: "70000" }],
  ])("rejects %s", (_case, source) => {
    expect(() => parseEnv(source)).toThrow();
  });
});
