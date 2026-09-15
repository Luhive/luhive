import { describe, expect, it } from "vitest";
import { Result } from "../src/result";

describe("Result", () => {
  it("builds a success without metadata", () => {
    expect(Result.success({ id: "person-1" })).toEqual({
      ok: true,
      data: { id: "person-1" },
    });
  });

  it("builds a success with pagination metadata", () => {
    expect(
      Result.success(["person-1"], { next_cursor: "next-page" }),
    ).toEqual({
      ok: true,
      data: ["person-1"],
      meta: { next_cursor: "next-page" },
    });
  });

  it("builds a failure with a message and field errors", () => {
    expect(
      Result.failure("invalid_query", {
        message: "Request validation failed",
        fields: [{ path: "email", message: "Invalid email address" }],
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "invalid_query",
        message: "Request validation failed",
        fields: [{ path: "email", message: "Invalid email address" }],
      },
    });
  });

  it("omits empty field errors", () => {
    expect(Result.failure("not_found", { fields: [] })).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
  });
});
