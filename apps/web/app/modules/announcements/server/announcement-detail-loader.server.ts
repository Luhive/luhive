import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export type AnnouncementDetailLoaderData = {
  announcement: {
    id: string;
    title: string;
    description: string;
    created_at: string;
    published: boolean;
    images: { id: string; image_url: string; sort_order: number }[];
  } | null;
  community: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export async function loader({
  params,
  context,
}: LoaderFunctionArgs): Promise<AnnouncementDetailLoaderData> {
  const { supabase } = context.get(requestSupabaseContext);

  const announcementId = (params as { announcementId?: string }).announcementId;
  const slug = (params as { slug?: string }).slug;

  if (!announcementId || !slug) {
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch the community
  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (communityError || !community) {
    throw new Response("Community not found", { status: 404 });
  }

  // Fetch the announcement
  const db = supabase as any;
  const { data: announcement, error: announcementError } = await db
    .from("community_announcements")
    .select("*")
    .eq("id", announcementId)
    .eq("community_id", community.id)
    .eq("published", true)
    .single();

  if (announcementError || !announcement) {
    throw new Response("Announcement not found", { status: 404 });
  }

  // Fetch images
  const { data: images, error: imagesError } = await db
    .from("community_announcement_images")
    .select("*")
    .eq("announcement_id", announcementId)
    .order("sort_order", { ascending: true });

  if (imagesError) {
    console.error("Error fetching images:", imagesError);
  }

  return {
    announcement: {
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      created_at: announcement.created_at,
      published: announcement.published,
      images: (images || []).map((img: any) => ({
        id: img.id,
        image_url: img.image_url,
        sort_order: img.sort_order,
      })),
    },
    community: {
      id: community.id,
      name: community.name,
      slug: community.slug,
    },
  };
}
