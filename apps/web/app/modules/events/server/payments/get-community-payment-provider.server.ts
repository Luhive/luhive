import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";

export async function getCommunityPaymentProvider(
  communityId: string,
): Promise<CommunitySettings.PaymentProvider> {
  const { data, error } = await createServiceRoleClient()
    .from("communities")
    .select("settings")
    .eq("id", communityId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read community settings: ${error.message}`);
  }

  return CommunitySettings.getPaymentProvider(data?.settings);
}
