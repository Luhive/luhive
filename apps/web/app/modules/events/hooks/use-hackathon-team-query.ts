import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRevalidator } from "react-router";
import type { HackathonTeamDetails } from "~/modules/events/model/hackathon-team";
import { eventRegistrationRootKey } from "~/shared/lib/query/query-keys";

type TeamResponse = { team: HackathonTeamDetails | null };

function hackathonTeamQueryOptions(eventId: string) {
  return {
    queryKey: ["hackathon-team", eventId] as const,
    queryFn: async () => {
      const response = await fetch(
        `/api/events/hackathon?eventId=${encodeURIComponent(eventId)}&view=team`,
      );
      if (!response.ok) throw new Error("Could not load the team.");
      const body = (await response.json()) as TeamResponse;
      if (!body.team) throw new Error("This team is not available.");
      return body.team;
    },
  };
}

export function useHackathonTeamQuery(eventId: string | null) {
  return useQuery({
    ...hackathonTeamQueryOptions(eventId ?? ""),
    enabled: Boolean(eventId),
  });
}

export function useHackathonTeamMutation(eventId: string) {
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  return useMutation({
    mutationFn: async (fields: Record<string, string>) => {
      const body = new FormData();
      body.set("eventId", eventId);
      for (const [key, value] of Object.entries(fields)) body.set(key, value);
      const response = await fetch("/api/events/hackathon", { method: "POST", body });
      const result = (await response.json()) as { success?: boolean; error?: string; left?: boolean };
      if (!response.ok || !result.success) throw new Error(result.error || "Could not update the team.");
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hackathon-team", eventId] });
      // Leaving cancels the registration, so the event page's state changes too.
      void queryClient.invalidateQueries({ queryKey: eventRegistrationRootKey });
      revalidator.revalidate();
    },
  });
}
