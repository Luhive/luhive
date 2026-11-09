export const PROFILE_NAME_MIN = 2;
export const PROFILE_NAME_MAX = 100;

export type ProfileNameActionData =
  | { success: true; fullName: string }
  | { success: false; error: string };

/** Collapses inner whitespace and trims, so "  Ali   Aliyev " saves as "Ali Aliyev". */
export function normalizeProfileName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
