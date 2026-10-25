// Values match the CHECK constraints on public.mobile_app_waitlist.
export const FIRST_FEATURE_OPTIONS = [
  { value: "event_notifications", label: "Tədbir bildirişləri" },
  { value: "qr_tickets", label: "QR bilet" },
  { value: "discover_events", label: "Yeni tədbirləri kəşf etmək" },
] as const;

export const PLATFORM_OPTIONS = [
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
] as const;

export type FirstFeature = (typeof FIRST_FEATURE_OPTIONS)[number]["value"];
export type Platform = (typeof PLATFORM_OPTIONS)[number]["value"];

export function parseFirstFeature(value: unknown): FirstFeature | null {
  return FIRST_FEATURE_OPTIONS.find((o) => o.value === value)?.value ?? null;
}

export function parsePlatform(value: unknown): Platform | null {
  return PLATFORM_OPTIONS.find((o) => o.value === value)?.value ?? null;
}
