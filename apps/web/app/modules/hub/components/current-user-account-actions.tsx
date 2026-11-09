import { Suspense } from "react";
import { Await } from "react-router";
import type { HubViewer, ManagedCommunity } from "~/modules/hub/model/hub-types";
import { HubAccountActions } from "~/modules/hub/components/hub-account-actions";
import { useCurrentUserQuery } from "~/shared/hooks/use-current-user-query";

type CurrentUserAccountActionsProps = {
  email: string | null;
  managedCommunities: Promise<ManagedCommunity[]>;
  showCreateCommunity?: boolean;
};

/**
 * Account actions for pages under the top navigation layout. The profile comes from the
 * current-user cache, which sign-in flows update without a reload; managed communities stream in.
 */
export function CurrentUserAccountActions({
  email,
  managedCommunities,
  showCreateCommunity,
}: CurrentUserAccountActionsProps) {
  const { data: profile } = useCurrentUserQuery();

  const toViewer = (communities: ManagedCommunity[]): HubViewer | null =>
    profile
      ? {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          email,
          managedCommunities: communities,
        }
      : null;

  const actions = (communities: ManagedCommunity[]) => (
    <HubAccountActions viewer={toViewer(communities)} showCreateCommunity={showCreateCommunity} />
  );

  return (
    <Suspense fallback={actions([])}>
      <Await resolve={managedCommunities} errorElement={actions([])}>
        {(communities) => actions(communities)}
      </Await>
    </Suspense>
  );
}
