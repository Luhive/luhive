import { Suspense } from "react";
import { Await } from "react-router";
import type { HubViewer, ManagedCommunity } from "~/modules/hub/model/hub-types";
import { HubAccountActions } from "~/modules/hub/components/hub-account-actions";
import { useCurrentUserQuery } from "~/shared/hooks/use-current-user-query";

type CurrentUserAccountActionsProps = {
  email: string | null;
  managedCommunities: Promise<ManagedCommunity[]>;
};

/**
 * Account actions for pages under the top navigation layout. The profile comes from the
 * current-user cache, which sign-in flows update without a reload; managed communities stream in.
 */
export function CurrentUserAccountActions({ email, managedCommunities }: CurrentUserAccountActionsProps) {
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

  return (
    <Suspense fallback={<HubAccountActions viewer={toViewer([])} />}>
      <Await resolve={managedCommunities} errorElement={<HubAccountActions viewer={toViewer([])} />}>
        {(communities) => <HubAccountActions viewer={toViewer(communities)} />}
      </Await>
    </Suspense>
  );
}
