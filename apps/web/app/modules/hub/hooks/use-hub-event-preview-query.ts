import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { HubEventPreviewResponse } from "~/modules/hub/model/hub-types";
import { Routes } from "~/shared/lib/routing/routes";

const hubEventPreviewKey = (eventId: string) => ["hub-event-preview", eventId] as const;

function hubEventPreviewQueryOptions(eventId: string) {
  return {
    queryKey: hubEventPreviewKey(eventId),
    queryFn: async () => {
      const response = await fetch(Routes.api.hub.eventPreview(eventId));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to load event preview");
      const data = (await response.json()) as HubEventPreviewResponse;
      return data.preview;
    },
    staleTime: 60_000,
  };
}

export function useHubEventPreviewQuery(eventId: string | null) {
  return useQuery({
    ...hubEventPreviewQueryOptions(eventId ?? ""),
    enabled: Boolean(eventId),
  });
}

/** Warms the preview on hover/press so the drawer usually opens fully loaded. */
export function usePrefetchHubEventPreview() {
  const queryClient = useQueryClient();
  return useCallback(
    (eventId: string) => {
      void queryClient.prefetchQuery(hubEventPreviewQueryOptions(eventId));
    },
    [queryClient],
  );
}
