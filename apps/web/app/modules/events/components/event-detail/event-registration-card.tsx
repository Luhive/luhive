import { Activity } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "~/shared/lib/utils/cn";
import { Card, CardContent } from "~/shared/components/ui/card";
import { Badge } from "~/shared/components/ui/badge";
import { AdminManagementView } from "./registration-states/admin-management-view";
import { ExternalLinkView } from "./registration-states/external-link-view";
import { ExternalPastView } from "./registration-states/external-past-view";
import { NativeRegisteredView } from "./registration-states/native-registered-view";
import { NativeCanRegisterView } from "./registration-states/native-can-register-view";
import { NativeClosedView } from "./registration-states/native-closed-view";
import type { Community, Event } from "~/shared/models/entity.types";
import type { TimeRemaining } from "~/modules/events/model/event-detail-view.types";
import type { UserData } from "~/modules/events/server/event-detail-loader.server";
import type { ExternalPlatform } from "~/modules/events/model/event.types";
import type { EventTrackingContext } from "~/modules/events/utils/event-session-tracker";
import type { HackathonViewer } from "~/modules/events/model/hackathon-team";

interface EventRegistrationCardProps {
	event: Event;
	community: Community;
	userData: UserData;
	timeRemaining: TimeRemaining | null;
	registrationDeadlineFormatted: string;
	hasCustomQuestions: boolean;
	isPastEvent: boolean;
	isExternalEvent: boolean;
	externalPlatform: ExternalPlatform | null;
	externalPlatformName: string;
	isRegistering: boolean;
	isUnregistering: boolean;
	eventTrackingContext: EventTrackingContext;
	highlighted?: boolean;
	hackathon?: HackathonViewer | null;
}

export function EventRegistrationCard({
	event,
	community,
	userData,
	timeRemaining,
	registrationDeadlineFormatted,
	hasCustomQuestions,
	isPastEvent,
	isExternalEvent,
	externalPlatform,
	externalPlatformName,
	isRegistering,
	isUnregistering,
	eventTrackingContext,
	highlighted = false,
	hackathon = null,
}: EventRegistrationCardProps) {
	const {
		registrationCount,
		isUserRegistered,
		userRegistrationStatus,
		canRegister,
		isOwnerOrAdmin,
		user,
		userProfile,
	} = userData;

	const hideRegistrationHeading =
		!isOwnerOrAdmin && !isExternalEvent && (isUserRegistered || canRegister);

	const useNativeAttendeePadding =
		!isOwnerOrAdmin && !isExternalEvent && (isUserRegistered || canRegister);

	return (
		<div className="space-y-4">
			<Activity mode={hideRegistrationHeading ? "hidden" : "visible"}>
				<div className="flex items-center gap-2">
					<h2 className="text-xl font-semibold">
						{isOwnerOrAdmin ? "Event Management" : isExternalEvent ? "Event" : "Registration"}
					</h2>
					{isExternalEvent && (
						<Badge variant="outline" className="border-primary/50 bg-primary/5 text-primary">
							<ExternalLink className="h-3 w-3 mr-1" />
							Link event
						</Badge>
					)}
				</div>
			</Activity>

			<Card
				data-highlight={highlighted ? "true" : undefined}
				className={cn(
					"bg-card/50 shadow-none transition-all border-primary/20 hover:border-primary/40 py-1.5",
					highlighted && "registration-card-highlight",
				)}
			>
				<CardContent
					className={
						useNativeAttendeePadding ? "px-3 py-3" : "px-4 pt-3 pb-0 space-y-4"
					}
				>
					<Activity mode={isOwnerOrAdmin ? "visible" : "hidden"}>
						<AdminManagementView event={event} community={community} isExternalEvent={isExternalEvent} />
					</Activity>

					<Activity
						mode={!isOwnerOrAdmin && isExternalEvent && !isPastEvent ? "visible" : "hidden"}
					>
						<ExternalLinkView
							event={event}
							community={community}
							externalPlatform={externalPlatform}
							externalPlatformName={externalPlatformName}
						/>
					</Activity>

					<Activity
						mode={!isOwnerOrAdmin && isExternalEvent && isPastEvent ? "visible" : "hidden"}
					>
						<ExternalPastView />
					</Activity>

					<Activity
						mode={!isOwnerOrAdmin && !isExternalEvent && isUserRegistered ? "visible" : "hidden"}
					>
						<NativeRegisteredView
							event={event}
							communityName={community.name}
							userRegistrationStatus={userRegistrationStatus}
							userCheckinToken={userData.userCheckinToken}
							discussionLink={event.discussion_link}
							isPastEvent={isPastEvent}
							isUnregistering={isUnregistering}
							user={user}
							userProfile={userProfile}
							pendingTicketPayment={userData.pendingTicketPayment}
							hackathon={hackathon}
							justRegistered={highlighted}
						/>
					</Activity>

					<Activity
						mode={
							!isOwnerOrAdmin && !isExternalEvent && !isUserRegistered && canRegister
								? "visible"
								: "hidden"
						}
					>
						<NativeCanRegisterView
							event={event}
							community={community}
							userData={userData}
							timeRemaining={timeRemaining}
							registrationDeadlineFormatted={registrationDeadlineFormatted}
							hasCustomQuestions={hasCustomQuestions}
							isRegistering={isRegistering}
							isPastEvent={isPastEvent}
							eventTrackingContext={eventTrackingContext}
						/>
					</Activity>

					<Activity
						mode={
							!isOwnerOrAdmin && !isExternalEvent && !isUserRegistered && !canRegister
								? "visible"
								: "hidden"
						}
					>
						<NativeClosedView
							event={event}
							registrationCount={registrationCount}
							isPastEvent={isPastEvent}
						/>
					</Activity>
				</CardContent>
			</Card>
		</div>
	);
}
