// Reads communities.settings. Import as a namespace:
//   import * as CommunitySettings from "@luhive/domain/v1/community-settings";
// The blob is untrusted JSON, so every reader falls back to the safe value
// when a key is missing or malformed.

export const Feature = {
  PublicPage: "public_page",
  Join: "join",
  Events: "events",
  Newsletter: "newsletter",
  PaidTicketing: "paid_ticketing",
} as const;

export type Feature = (typeof Feature)[keyof typeof Feature];

export const PaymentProvider = {
  Checkila: "checkila",
  Manual: "manual",
} as const;

export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

const paymentProviders: readonly string[] = Object.values(PaymentProvider);

// Only a literal `true` turns a feature on.
export function hasFeature(settings: unknown, feature: Feature): boolean {
  if (!isRecord(settings)) return false;

  const features = settings.features;
  if (!isRecord(features)) return false;

  return features[feature] === true;
}

// Absent means manual: Checkila only accepts callbacks for communities it has
// a key for, so it has to be chosen explicitly.
export function getPaymentProvider(settings: unknown): PaymentProvider {
  if (!isRecord(settings)) return PaymentProvider.Manual;

  const payments = settings.payments;
  if (!isRecord(payments)) return PaymentProvider.Manual;

  const provider = payments.provider;
  return typeof provider === "string" && paymentProviders.includes(provider)
    ? (provider as PaymentProvider)
    : PaymentProvider.Manual;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
