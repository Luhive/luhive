import { useEffect, type MutableRefObject } from "react";
import { useActionData, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { EventDetailActionData } from "~/modules/events/model/event-detail-view.types";
import { useRegistrationCacheUpdate } from "~/modules/events/hooks/use-event-registration-query";

export interface UseEventDetailToastsOptions {
  eventId?: string;
  onRegisterSuccess?: () => void;
  submittedIntentRef?: MutableRefObject<string | null>;
}

/**
 * Handles toast side-effects from action data and search params.
 */
export function useEventDetailToasts(options?: UseEventDetailToastsOptions) {
	const actionData = useActionData<EventDetailActionData>();
	const [searchParams] = useSearchParams();
  const updateRegistrationCache = useRegistrationCacheUpdate(
    options?.eventId ?? "__missing-event-id__",
  );

	useEffect(() => {
		if (!actionData) return;
		if (actionData.success && actionData.message) {
			toast.success(actionData.message);
      if (options?.eventId && actionData.registrationState) {
        updateRegistrationCache(actionData.registrationState);
      }
			const intent = options?.submittedIntentRef?.current;
			if (intent === "register" || intent === "accept-invite") {
        options?.onRegisterSuccess?.();
        if (options?.submittedIntentRef) {
          options.submittedIntentRef.current = null;
        }
      }
		} else if (actionData.error) {
			toast.error(actionData.error, actionData.contactUrl
				? {
						action: {
							label: "Contact organiser",
							onClick: () => {
							window.location.href = actionData.contactUrl!;
						},
						},
					}
				: undefined);
			if (options?.submittedIntentRef) {
				options.submittedIntentRef.current = null;
			}
		}
	}, [actionData, options?.eventId, updateRegistrationCache]);

	useEffect(() => {
		const verified = searchParams.get("verified");
		if (verified === "success") {
			toast.success("Email verified! You're registered for the event.");
		} else if (verified === "already") {
			toast.info("You're already registered for this event.");
		} else if (verified === "pending_approval") {
			toast.success("Email verified! Your registration is pending approval.");
		}
	}, [searchParams]);
}
