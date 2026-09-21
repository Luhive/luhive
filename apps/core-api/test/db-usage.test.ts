import { describe, expect, it } from "vitest";
import { recordQuery, trackDbUsage } from "../src/lib/db-usage";

describe("per-request database usage", () => {
  it("accumulates every query in the request it belongs to", async () => {
    const usage = await trackDbUsage(async (collected) => {
      recordQuery(3.2);
      recordQuery(2.8);
      return collected;
    });

    expect(usage).toEqual({ queries: 2, ms: 6 });
  });

  it("ignores queries made outside a request", () => {
    expect(() => recordQuery(12)).not.toThrow();
  });

  it("keeps concurrent requests separate", async () => {
    const [first, second] = await Promise.all([
      trackDbUsage(async (usage) => {
        recordQuery(1);
        await new Promise((resolve) => setTimeout(resolve, 10));
        recordQuery(1);
        return usage;
      }),
      trackDbUsage(async (usage) => {
        recordQuery(5);
        return usage;
      }),
    ]);

    expect(first).toEqual({ queries: 2, ms: 2 });
    expect(second).toEqual({ queries: 1, ms: 5 });
  });

  it("reports usage even when the request throws", async () => {
    const usage = { queries: 0, ms: 0 };

    await expect(
      trackDbUsage(async (collected) => {
        recordQuery(4);
        Object.assign(usage, collected);
        throw new Error("handler failed");
      }),
    ).rejects.toThrow("handler failed");

    expect(usage).toEqual({ queries: 1, ms: 4 });
  });
});
