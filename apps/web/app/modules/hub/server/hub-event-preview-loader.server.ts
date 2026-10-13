import type { LoaderFunctionArgs } from "react-router";
import { createClient } from "~/shared/lib/supabase/server";
import type { HubEventPreviewResponse } from "~/modules/hub/model/hub-v2-types";
import { findHubEventPreview } from "~/modules/hub/data/hub-event-preview-repo.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respond(body: HubEventPreviewResponse, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, max-age=60" },
  });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const eventId = params.eventId ?? "";
  if (!UUID_PATTERN.test(eventId)) return respond({ preview: null }, 404);

  const { supabase } = createClient(request);
  const { preview, error } = await findHubEventPreview(supabase, eventId);

  if (error) {
    console.error("Error fetching hub event preview:", error);
    return respond({ preview: null }, 500);
  }

  return respond({ preview }, preview ? 200 : 404);
}
