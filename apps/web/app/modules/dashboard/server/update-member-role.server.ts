import type { ActionFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import {
  getMemberById,
  updateMemberRole,
} from "~/modules/dashboard/data/members-repo.server";

type RoleIntent = "promote" | "demote";

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return { success: false, error: "Method not allowed" };
  }

  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const user = await findAuthUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const formData = await request.formData();
  const memberId = formData.get("memberId") as string;
  const communityId = formData.get("communityId") as string;
  const intent = formData.get("intent") as RoleIntent;

  if (!memberId || !communityId || !intent) {
    return { success: false, error: "Missing required fields" };
  }

  if (intent !== "promote" && intent !== "demote") {
    return { success: false, error: "Invalid intent" };
  }

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, created_by")
    .eq("id", communityId)
    .single();

  if (communityError || !community) {
    return { success: false, error: "Community not found" };
  }

  if (community.created_by !== user.id) {
    return { success: false, error: "Only the community owner can manage roles" };
  }

  const serviceClient = createServiceRoleClient();
  const { member, error: memberError } = await getMemberById(
    serviceClient,
    memberId,
    communityId,
  );

  if (memberError || !member) {
    return { success: false, error: "Member not found" };
  }

  const currentRole = member.role ?? "member";

  if (currentRole === "owner") {
    return { success: false, error: "Cannot change the owner's role" };
  }

  const nextRole =
    intent === "promote"
      ? currentRole === "member"
        ? "admin"
        : null
      : currentRole === "admin"
        ? "member"
        : null;

  if (!nextRole) {
    return {
      success: false,
      error:
        intent === "promote"
          ? "Only members can be promoted to admin"
          : "Only admins can be demoted to member",
    };
  }

  const { error: updateError } = await updateMemberRole(serviceClient, {
    memberId,
    communityId,
    role: nextRole,
  });

  if (updateError) {
    console.error("Error updating member role:", updateError);
    return { success: false, error: "Failed to update member role" };
  }

  return { success: true, role: nextRole };
}
