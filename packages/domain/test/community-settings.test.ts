import { describe, expect, it } from "vitest";
import * as CommunitySettings from "../src/v1/community-settings";

const { Feature, PaymentProvider } = CommunitySettings;

describe("CommunitySettings.hasFeature", () => {
  it("is on only for a literal true", () => {
    const settings = { features: { join: true, newsletter: "true" } };
    expect(CommunitySettings.hasFeature(settings, Feature.Join)).toBe(true);
    expect(CommunitySettings.hasFeature(settings, Feature.Newsletter)).toBe(
      false,
    );
    expect(CommunitySettings.hasFeature(settings, Feature.Events)).toBe(false);
  });

  it("is off for missing or malformed settings", () => {
    for (const settings of [null, undefined, [], "x", { features: [] }]) {
      expect(CommunitySettings.hasFeature(settings, Feature.Join)).toBe(false);
    }
  });
});

describe("CommunitySettings.getPaymentProvider", () => {
  it("returns the configured provider", () => {
    expect(
      CommunitySettings.getPaymentProvider({
        payments: { provider: "checkila" },
      }),
    ).toBe(PaymentProvider.Checkila);
    expect(
      CommunitySettings.getPaymentProvider({ payments: { provider: "manual" } }),
    ).toBe(PaymentProvider.Manual);
  });

  it("falls back to manual when absent or unknown", () => {
    for (const settings of [
      null,
      {},
      { payments: null },
      { payments: { provider: "stripe" } },
      { payments: { provider: 1 } },
      { features: { paid_ticketing: true } },
    ]) {
      expect(CommunitySettings.getPaymentProvider(settings)).toBe(
        PaymentProvider.Manual,
      );
    }
  });
});
