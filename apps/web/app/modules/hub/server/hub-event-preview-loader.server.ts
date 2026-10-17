import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { HubEventPreviewResponse } from "~/modules/hub/model/hub-types";
import { findHubEventPreview } from "~/modules/hub/data/hub-event-preview-repo.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respond(body: HubEventPreviewResponse, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const eventId = params.eventId ?? "";
  if (!UUID_PATTERN.test(eventId)) return respond({ preview: null }, 404);

  const { supabase } = context.get(requestSupabaseContext);
  const { preview, error } = await findHubEventPreview(supabase, eventId);

  if (error) {
    console.error("Error fetching hub event preview:", error);
    return respond({ preview: null }, 500);
  }

  return respond({ preview }, preview ? 200 : 404);
}
