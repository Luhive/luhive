import { getHubPreview } from "~/modules/hub/data/hub-repo.server";
import type { LandingHubPreview } from "~/modules/landing/model/landing-hub-preview";
import { data, type LoaderFunctionArgs } from "react-router";
import { sharedPageCacheHeaders, uncachedHeaders } from "~/shared/lib/http/shared-cache.server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

function communityCountLabel(count: number): string | null {
  if (count <= 0) return null;
  if (count < 10) return String(count);
  return `${Math.floor(count / 10) * 10}+`;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const { supabase } = context.get(requestSupabaseContext);
    const preview = await getHubPreview(supabase);
    const cacheHeaders = sharedPageCacheHeaders(request);
    if (!preview) {
      return data({ hubPreview: null satisfies LandingHubPreview | null }, { headers: cacheHeaders });
    }

    const hubPreview: LandingHubPreview = {
      logos: preview.logos,
      communityCountLabel: communityCountLabel(preview.communityCount),
    };
    return data({ hubPreview }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Landing hub preview unavailable:", error);
    // Not cached, so the next visitor retries instead of seeing an empty preview for minutes.
    return data({ hubPreview: null satisfies LandingHubPreview | null }, { headers: uncachedHeaders() });
  }
}
