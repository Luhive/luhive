import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { sendCommunityWaitlistNotification } from "~/shared/lib/email.server";
import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";

export type CreateCommunityActionData = {
  success?: boolean;
  error?: string;
};

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<CreateCommunityActionData | Response> {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const user = await findAuthUser();

  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const userEmail = user.email || "Unknown";
  const userName = profile?.full_name || userEmail.split("@")[0] || "User";

  const formData = await request.formData();
  const name = (formData.get("name") as string)?.trim();
  const website = (formData.get("website") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name || name.length < 2) {
    return { success: false, error: "Community name must be at least 2 characters" };
  }

  if (name.length > 100) {
    return { success: false, error: "Community name must be 100 characters or less" };
  }

  const { error: waitlistError } = await supabase
    .from("community_waitlist")
    .insert({
      user_id: user.id,
      community_name: name,
      website: website,
      description: description,
      status: "pending",
    });

  if (waitlistError) {
    console.error("Error adding to waitlist:", waitlistError);
    return {
      success: false,
      error: waitlistError.message || "Failed to submit community request",
    };
  }

  try {
    await sendCommunityWaitlistNotification({
      communityName: name,
      userName: userName,
      userEmail: userEmail,
      website: website,
      description: description,
      submittedAt: new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    });
  } catch (emailError) {
    console.error("Error sending waitlist notification email:", emailError);
  }

  return redirect("/create-community/success");
}
