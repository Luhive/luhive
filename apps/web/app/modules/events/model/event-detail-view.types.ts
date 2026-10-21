import type { Community, Event, Profile } from "~/shared/models/entity.types";
import type { Database } from "~/shared/models/database.types";
import type { UserData } from "~/modules/events/server/event-detail-loader.server";
import type { PendingTicketPayment } from "~/modules/events/model/ticket-order.types";

/** Re-export base entities for convenience; prefer importing from ~/shared/models/entity.types */
export type { Community, Event, Profile };

/** Event status enum */
export type EventStatus = Database["public"]["Enums"]["event_status"];

/** Event type enum */
export type EventType = Database["public"]["Enums"]["event_type"];

/** Community with aggregated counts for display/skeleton */
export interface CommunityWithStats {
	community: Community;
	memberCount: number;
	eventCount: number;
	description?: string;
	verified?: boolean;
}

/** Live registration state for an event, cached client-side via react-query */
export interface EventRegistrationState {
	isUserRegistered: boolean;
	userRegistrationStatus: string | null;
	userCheckinToken: string | null;
	registrationCount: number;
}

/** Full event-page user slice cached client-side via react-query */
export interface EventPageUserState extends EventRegistrationState {
	user: { id: string; email?: string | null } | null;
	userProfile: Profile | null;
	isCommunityMember: boolean;
	canRegister: boolean;
	/** Set while a paid registration is waiting for its payment. */
	pendingTicketPayment: PendingTicketPayment | null;
}

/** Action response payload from event-detail action */
export interface EventDetailActionData {
  success: boolean;
  error?: string;
  /** Where to reach the organiser when a paid ticket can't be cancelled here. */
  contactUrl?: string;
  message?: string;
  needsCustomQuestions?: boolean;
  anonymousName?: string;
  anonymousEmail?: string;
  registrationState?: EventRegistrationState & { canRegister?: boolean };
}

/** Time remaining until registration deadline */
export interface TimeRemaining {
	days: number;
	hours: number;
	formatted: string;
}

/** Re-export for convenience */
export type { UserData as DeferredUserData };
