import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { generateHubOgImage } from "~/modules/hub/server/hub-og-image.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { supabase } = context.get(requestSupabaseContext);
  return generateHubOgImage(supabase, publicOrigin(request), params.week ?? "");
}
