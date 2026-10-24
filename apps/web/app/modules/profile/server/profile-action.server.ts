import { redirect } from "react-router";
import { ProfileCompleteness } from "~/modules/profile/model/profile-completeness";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { Json } from "~/shared/models/database.types";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const user = await findAuthUser();

  if (!user) {
    const returnUrl = new URL(request.url).pathname + new URL(request.url).search;
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `pending_return_to=${encodeURIComponent(returnUrl)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );
    return redirect("/login", { headers });
  }

  const formData = await request.formData();
  const fullName = formData.get("full_name") as string;
  const bio = formData.get("bio") as string;

  const socialLinks: Record<string, string | null> = {};
  for (const id of ProfileLinks.ids) {
    const raw = formData.get(id);
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (!trimmed) {
      socialLinks[id] = null;
      continue;
    }
    const url = ProfileLinks.url(id, trimmed);
    if (!url) {
      return { success: false, error: `Enter a valid ${id} link` };
    }
    socialLinks[id] = url;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("metadata, avatar_url, gamification")
    .eq("id", user.id)
    .single();

  const metadata =
    existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? existing.metadata
      : {};

  const { complete } = ProfileCompleteness.check({
    fullName,
    avatarUrl: existing?.avatar_url,
    bio,
    links: socialLinks as ProfileLinks.Map,
  });
  const justCompleted = complete && !ProfileCompleteness.hasBadge(existing?.gamification);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      bio: bio || null,
      metadata: { ...metadata, social_links: socialLinks } as Json,
      ...(complete ? { gamification: ProfileCompleteness.award(existing?.gamification) } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    justCompleted,
    message: "Profile updated successfully!",
  };
}
