import { data, type LoaderFunctionArgs } from "react-router";
import { listCommunityInvites } from "~/modules/dashboard/data/community-invites-repo.server";
import { findOwnedCommunity } from "~/modules/dashboard/server/community-owner.server";
import type { CommunityInvitesResponse } from "~/modules/dashboard/model/community-invite";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const communityId = new URL(request.url).searchParams.get("communityId") ?? "";
  const owned = await findOwnedCommunity(context, communityId);
  if (!owned) {
    return data<CommunityInvitesResponse>({ invites: [] }, { status: 403 });
  }

  return { invites: await listCommunityInvites(communityId) } satisfies CommunityInvitesResponse;
}
