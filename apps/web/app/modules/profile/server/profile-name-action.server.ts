import type { ActionFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { Json } from "~/shared/models/database.types";
import {
  PROFILE_NAME_MAX,
  PROFILE_NAME_MIN,
  normalizeProfileName,
  type ProfileNameActionData,
} from "~/modules/profile/model/profile-name";

/**
 * Updates only the signed-in user's display name (used inline on event registration).
 * Also records that the user confirmed their name, so the OAuth-name prompt stops showing.
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<ProfileNameActionData> {
  if (request.method !== "POST") {
    return { success: false, error: "Method not allowed" };
  }

  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const user = await findAuthUser();
  if (!user) {
    return { success: false, error: "Please sign in again" };
  }

  const formData = await request.formData();
  const fullName = normalizeProfileName(String(formData.get("fullName") ?? ""));
  if (fullName.length < PROFILE_NAME_MIN) {
    return { success: false, error: `Name must be at least ${PROFILE_NAME_MIN} characters` };
  }
  if (fullName.length > PROFILE_NAME_MAX) {
    return { success: false, error: `Name must be at most ${PROFILE_NAME_MAX} characters` };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .single();

  const metadata =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? existing.metadata
      : {};

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      metadata: { ...metadata, name_confirmed: true } as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Could not save your name. Please try again." };
  }

  return { success: true, fullName };
}
