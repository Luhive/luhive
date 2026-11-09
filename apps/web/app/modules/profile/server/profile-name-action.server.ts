import type { ActionFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { ProfileNameActionData } from "~/modules/profile/model/profile-name";
import { updateOwnProfileName } from "~/modules/profile/server/update-profile-name.server";

/** Updates only the signed-in user's display name (used inline on one-click event registration). */
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
  return updateOwnProfileName(supabase, user.id, String(formData.get("fullName") ?? ""));
}
