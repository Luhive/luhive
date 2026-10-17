import type { LoaderFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { getNotifyRegistrations } from "~/modules/dashboard/data/notification-settings-repo.server";
import type { NotificationSettingsLoaderData } from "~/modules/dashboard/model/dashboard-types";

export async function loader({
  params,
  context,
}: LoaderFunctionArgs): Promise<NotificationSettingsLoaderData> {
  const slug = params.slug;
  if (!slug) {
    return { notifyRegistrations: true };
  }

  const { supabase, findAuthUser } = context.get(requestSupabaseContext);
  const user = await findAuthUser();

  if (!user) {
    return { notifyRegistrations: true };
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!community) {
    return { notifyRegistrations: true };
  }

  const serviceClient = createServiceRoleClient();
  const { notifyRegistrations } = await getNotifyRegistrations(
    serviceClient,
    community.id,
    user.id,
  );

  return { notifyRegistrations };
}
