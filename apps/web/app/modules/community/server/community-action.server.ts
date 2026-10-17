import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { Database } from "~/shared/models/database.types";
import type { VisitAnalytics } from "~/modules/community/utils/visit-tracker";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "track_visit") {
    try {
      const communityId = formData.get("communityId") as string;
      const sessionId = formData.get("sessionId") as string;
      const analyticsData = formData.get("analytics") as string;
      const analytics: VisitAnalytics = JSON.parse(analyticsData);

      const user = await findAuthUser();

      supabase
        .from("community_visits")
        .insert({
          community_id: communityId,
          session_id: sessionId,
          user_id: user?.id || null,
          metadata:
            analytics as unknown as Database["public"]["Tables"]["community_visits"]["Insert"]["metadata"],
        })
        .then(({ error }) => {
          if (error) console.error("Failed to track visit:", error);
        });

      return { "": "" };
    } catch (error) {
      console.error("Visit tracking error:", error);
      return { success: false };
    }
  }

  return { success: false };
}
