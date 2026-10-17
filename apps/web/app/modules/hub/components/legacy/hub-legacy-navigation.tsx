import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TopNavigation } from "~/shared/components/navigation";
import {
  useCurrentUserQuery,
  useSetCurrentUserCache,
} from "~/shared/hooks/use-current-user-query";
import { clearEventRegistrationSessionState } from "~/modules/events/hooks/use-event-registration-query";

/** The previous top navigation, kept for /hub-legacy only. */
export function HubLegacyNavigation() {
  const queryClient = useQueryClient();
  const setCurrentUserCache = useSetCurrentUserCache();
  const { data: user } = useCurrentUserQuery();

  const handleLogout = useCallback(() => {
    setCurrentUserCache(null, false);
    clearEventRegistrationSessionState(queryClient, { revalidate: false });
  }, [queryClient, setCurrentUserCache]);

  return <TopNavigation user={user} showCreateCommunityOnMobile onLogout={handleLogout} />;
}
