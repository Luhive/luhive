import type { ActionFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { countWords } from "~/shared/lib/utils/text";

export async function action({ request, params, context }: ActionFunctionArgs) {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const formData = await request.formData();
  const slug = (params as { slug?: string }).slug;

  if (!slug) {
    return { success: false, error: "Invalid community" };
  }

  const user = await findAuthUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, created_by, slug")
    .eq("slug", slug)
    .single();

  if (communityError || !community) {
    return { success: false, error: "Community not found" };
  }

  const name = formData.get("name") as string;
  const tagline = formData.get("tagline") as string;
  const description = formData.get("description") as string;
  const website = formData.get("website") as string;
  const instagram = formData.get("instagram") as string;
  const linkedin = formData.get("linkedin") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const discord = formData.get("discord") as string;
  const logo_url = formData.get("logo_url") as string;

  const taglineWordCount = countWords(tagline);
  const descriptionWordCount = countWords(description);

  if (taglineWordCount > 25) {
    return { success: false, error: "Tagline must be 25 words or less" };
  }
  if (descriptionWordCount > 100) {
    return { success: false, error: "Description must be 100 words or less" };
  }

  const socialLinks = {
    website: website || null,
    instagram: instagram || null,
    linkedin: linkedin || null,
    whatsapp: whatsapp || null,
    discord: discord || null,
  };

  const { error } = await supabase
    .from("communities")
    .update({
      name,
      tagline,
      description,
      social_links: socialLinks,
      logo_url: logo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "Community updated successfully!" };
}
