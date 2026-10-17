import type { ActionFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { updateNotifyRegistrations } from "~/modules/dashboard/data/notification-settings-repo.server";

export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return { success: false, error: "Method not allowed" };
  }

  const slug = params.slug;
  if (!slug) {
    return { success: false, error: "Invalid community" };
  }

  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const user = await findAuthUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const formData = await request.formData();
  const notifyRaw = formData.get("notify_registrations");
  if (notifyRaw !== "true" && notifyRaw !== "false") {
    return { success: false, error: "Invalid preference value" };
  }
  const notifyRegistrations = notifyRaw === "true";

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("slug", slug)
    .single();

  if (communityError || !community) {
    return { success: false, error: "Community not found" };
  }

  const isOwner = community.created_by === user.id;
  if (!isOwner) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      return { success: false, error: "Not authorized" };
    }
  }

  const serviceClient = createServiceRoleClient();
  const { error: updateError } = await updateNotifyRegistrations(serviceClient, {
    communityId: community.id,
    userId: user.id,
    notifyRegistrations,
  });

  if (updateError) {
    console.error("Failed to update notification preference:", updateError);
    return { success: false, error: "Failed to update notification preference" };
  }

  return { success: true, notifyRegistrations };
}
