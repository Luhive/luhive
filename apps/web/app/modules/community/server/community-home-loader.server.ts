import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { getUserAgent } from "~/modules/community/utils/user-agent";
import { getIpLocation } from "~/modules/community/utils/get-ip-location";
import {
  prepareVisitAnalytics,
  type VisitAnalytics,
} from "~/modules/community/utils/visit-tracker";
import type { LoaderFunctionArgs } from "react-router";

export type CommunityAnnouncement = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  images: { id: string; image_url: string; sort_order: number }[];
  viewCount: number;
};

export type CommunityHomeLoaderData = {
  analytics: VisitAnalytics;
  memberCount: number;
  eventCount: number;
  announcements: CommunityAnnouncement[];
};

export async function loader({
  request,
  params,
  context,
}: LoaderFunctionArgs): Promise<CommunityHomeLoaderData> {
  const { supabase } = context.get(requestSupabaseContext);

  const userAgent = getUserAgent(request);
  const location = getIpLocation(request);
  const analytics = prepareVisitAnalytics(userAgent, location, false);

  const slug = (params as { slug?: string }).slug;

  if (!slug) {
    return {
      analytics,
      memberCount: 0,
      eventCount: 0,
      announcements: [],
    };
  }

  const { data: community, error } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error || !community) {
    throw new Response("Community not found", { status: 404 });
  }

  const [memberCountResult, eventCountResult] = await Promise.all([
    supabase
      .from("community_members")
      .select("*", { count: "exact", head: true })
      .eq("community_id", community.id),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("community_id", community.id)
      .eq("status", "published"),
  ]);

  let coHostCount = 0;
  try {
    const { data: coHostRows } = await supabase
      .from("event_collaborations")
      .select(
        "event:events!event_collaborations_event_id_fkey (id, status, community_id)",
      )
      .eq("community_id", community.id)
      .eq("status", "accepted");

    (coHostRows || []).forEach((row: {
      event:
        | { id: string; status: string; community_id: string }
        | { id: string; status: string; community_id: string }[]
        | null;
    }) => {
      const event =
        row.event && (Array.isArray(row.event) ? row.event[0] : row.event);
      if (
        event &&
        event.status === "published" &&
        event.community_id !== community.id
      ) {
        coHostCount += 1;
      }
    });
  } catch (err) {
    console.error("Failed to load co-host events for community page:", err);
  }

  const { data: announcementsData } = await supabase
    .from("community_announcements")
    .select("id, title, description, created_at")
    .eq("community_id", community.id)
    .eq("published", true)
    .order("created_at", { ascending: false });

  const announcementIds = (announcementsData || []).map((item) => item.id);
  let imagesData: {
    id: string;
    announcement_id: string;
    image_url: string;
    sort_order: number;
  }[] = [];
  let viewCountsData: { announcement_id: string }[] = [];

  if (announcementIds.length > 0) {
    const [imagesResult, viewCountsResult] = await Promise.all([
      supabase
        .from("community_announcement_images")
        .select("id, announcement_id, image_url, sort_order")
        .in("announcement_id", announcementIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("announcement_views")
        .select("announcement_id")
        .in("announcement_id", announcementIds),
    ]);

    imagesData = imagesResult.data || [];
    viewCountsData = viewCountsResult.data || [];
  }

  const imagesByAnnouncement = new Map<string, typeof imagesData>();
  for (const image of imagesData) {
    const existing = imagesByAnnouncement.get(image.announcement_id) || [];
    existing.push(image);
    imagesByAnnouncement.set(image.announcement_id, existing);
  }

  const viewCountsByAnnouncement = new Map<string, number>();
  for (const view of viewCountsData) {
    const count = (viewCountsByAnnouncement.get(view.announcement_id) || 0) + 1;
    viewCountsByAnnouncement.set(view.announcement_id, count);
  }

  const announcements = (announcementsData || []).map((announcement) => ({
    ...announcement,
    images: imagesByAnnouncement.get(announcement.id) || [],
    viewCount: viewCountsByAnnouncement.get(announcement.id) || 0,
  }));

  return {
    analytics,
    memberCount: memberCountResult.count || 0,
    eventCount: (eventCountResult.count || 0) + coHostCount,
    announcements,
  };
}
