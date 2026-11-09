import type { createClient } from "~/shared/lib/supabase/server";
import type { Json } from "~/shared/models/database.types";
import {
  PROFILE_NAME_MAX,
  PROFILE_NAME_MIN,
  normalizeProfileName,
} from "~/modules/profile/model/profile-name";

type Supabase = ReturnType<typeof createClient>["supabase"];

export type UpdateProfileNameResult =
  | { success: true; fullName: string }
  | { success: false; error: string };

/**
 * Sets the user's own display name and marks it confirmed, so the
 * "is this your name?" prompt for OAuth sign-ups stops showing.
 */
export async function updateOwnProfileName(
  supabase: Supabase,
  userId: string,
  rawName: string,
): Promise<UpdateProfileNameResult> {
  const fullName = normalizeProfileName(rawName);
  if (fullName.length < PROFILE_NAME_MIN) {
    return { success: false, error: `Name must be at least ${PROFILE_NAME_MIN} characters` };
  }
  if (fullName.length > PROFILE_NAME_MAX) {
    return { success: false, error: `Name must be at most ${PROFILE_NAME_MAX} characters` };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("full_name, metadata")
    .eq("id", userId)
    .single();

  const metadata =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? existing.metadata
      : {};

  if (existing?.full_name === fullName && (metadata as { name_confirmed?: boolean }).name_confirmed) {
    return { success: true, fullName };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      metadata: { ...metadata, name_confirmed: true } as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { success: false, error: "Could not save your name. Please try again." };
  }
  return { success: true, fullName };
}
