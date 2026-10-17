import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { Routes } from "~/shared/lib/routing/routes";
import { resolvePublicEvent } from "~/modules/events/server/resolve-public-event.server";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const communitySlug = (params as { slug?: string }).slug;
  const eventId = (params as { eventId?: string }).eventId;

  if (!communitySlug || !eventId) {
    throw new Response("Not Found", { status: 404 });
  }

  const { supabase } = context.get(requestSupabaseContext);
  const resolved = await resolvePublicEvent(supabase, communitySlug, eventId, {
    publishedOnly: false,
  });

  if (!resolved?.event.slug) {
    throw new Response("Not Found", { status: 404 });
  }

  throw redirect(
    Routes.community.eventCollaboration(communitySlug, resolved.event.slug),
    301,
  );
}
