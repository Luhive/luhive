import { getHubPreview } from "~/modules/hub/data/hub-repo.server";
import type { LandingHubPreview } from "~/modules/landing/model/landing-hub-preview";
import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

function communityCountLabel(count: number): string | null {
  if (count <= 0) return null;
  if (count < 10) return String(count);
  return `${Math.floor(count / 10) * 10}+`;
}

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const { supabase } = context.get(requestSupabaseContext);
    const preview = await getHubPreview(supabase);
    if (!preview) return { hubPreview: null satisfies LandingHubPreview | null };

    const hubPreview: LandingHubPreview = {
      logos: preview.logos,
      communityCountLabel: communityCountLabel(preview.communityCount),
    };
    return { hubPreview };
  } catch (error) {
    console.error("Landing hub preview unavailable:", error);
    return { hubPreview: null satisfies LandingHubPreview | null };
  }
}
