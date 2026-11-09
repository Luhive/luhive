import { Link, Form } from "react-router";
import { Activity } from "react";
import { Hourglass, CalendarClock } from "lucide-react";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { Button } from "~/shared/components/ui/button";
import { useEventStartTimer } from "~/modules/events/hooks/use-event-start-timer";
import type { Community, Event } from "~/shared/models/entity.types";
import type { UserData } from "~/modules/events/server/event-detail-loader.server";
import type { TimeRemaining } from "~/modules/events/model/event-detail-view.types";
import type { EventTrackingContext } from "~/modules/events/utils/event-session-tracker";
import { EventStartCountdownBadge } from "./shared/event-start-countdown-badge";
import { RegistrationIdentityRow } from "./shared/registration-identity-row";
import { RegistrationPriceLine } from "./shared/registration-price-line";
import { isPaidEvent } from "~/modules/events/utils/event-price-label";
import { RegistrationStatusLine } from "./shared/registration-status-line";
import { RegistrationTwoColumnLayout } from "./shared/registration-two-column-layout";
import {
  getRegistrationAvatarInitials,
  getRegistrationDisplayName,
} from "./shared/registration-user-display";

interface NativeCanRegisterViewProps {
  event: Event;
  community: Community;
  userData: UserData;
  timeRemaining: TimeRemaining | null;
  registrationDeadlineFormatted: string;
  hasCustomQuestions: boolean;
  isRegistering: boolean;
  isPastEvent: boolean;
  eventTrackingContext: EventTrackingContext;
}

function CompactRegistrationDeadlineBanner({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
}: {
  icon: typeof Hourglass;
  iconClassName?: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background">
        <Icon className={iconClassName ?? "h-3.5 w-3.5 text-primary"} />
      </div>
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function RegisterButton({
  hasCustomQuestions,
  registerUrl,
  isRegistering,
  isPaid,
  eventTrackingContext,
}: {
  hasCustomQuestions: boolean;
  registerUrl: string;
  isRegistering: boolean;
  isPaid: boolean;
  eventTrackingContext: EventTrackingContext;
}) {
  if (hasCustomQuestions) {
    return (
      <Button asChild className="w-full" size="sm" disabled={isRegistering}>
        <Link to={registerUrl}>{isPaid ? "Buy ticket" : "Register"}</Link>
      </Button>
    );
  }

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="register" />
      <input
        type="hidden"
        name="eventSessionId"
        value={eventTrackingContext.sessionId}
      />
      <input
        type="hidden"
        name="eventUtmSource"
        value={eventTrackingContext.utmSource}
      />
      <input
        type="hidden"
        name="eventUtmMedium"
        value={eventTrackingContext.utmMedium ?? ""}
      />
      <input
        type="hidden"
        name="eventUtmCampaign"
        value={eventTrackingContext.utmCampaign ?? ""}
      />
      <input
        type="hidden"
        name="eventUtmContent"
        value={eventTrackingContext.utmContent ?? ""}
      />
      <input
        type="hidden"
        name="eventUtmTerm"
        value={eventTrackingContext.utmTerm ?? ""}
      />
      <input
        type="hidden"
        name="eventFirstVisitStartedAt"
        value={eventTrackingContext.firstVisitStartedAt}
      />
      <Button
        type="submit"
        className="w-full"
        size="sm"
        disabled={isRegistering}
      >
        {isRegistering
          ? isPaid
            ? "Preparing payment..."
            : "Registering..."
          : isPaid
            ? "Buy ticket"
            : "Register"}
      </Button>
    </Form>
  );
}

export function NativeCanRegisterView({
  event,
  community,
  userData,
  timeRemaining,
  registrationDeadlineFormatted,
  hasCustomQuestions,
  isRegistering,
  isPastEvent,
  eventTrackingContext,
}: NativeCanRegisterViewProps) {
  const { user, userProfile } = userData;
  const registerUrl = Routes.community.eventRegister(
    community.slug,
    publicEventSlug(event),
  );

  const timeUntilStart = useEventStartTimer(
    event.start_time,
    event.timezone,
    isPastEvent,
  );

  const displayName = getRegistrationDisplayName(userProfile, user);
  const avatarInitials = getRegistrationAvatarInitials(userProfile, user);

  if (user) {
    return (
      <div className="space-y-3">
        <RegistrationTwoColumnLayout
          leftColumn={
            <>
              <RegistrationIdentityRow
                displayName={displayName}
                avatarUrl={userProfile?.avatar_url}
                avatarInitials={avatarInitials}
                // Events with a registration form edit the name there; one-click events have no form.
                editable={
                  hasCustomQuestions
                    ? undefined
                    : {
                        fullName: userProfile?.full_name ?? null,
                        askToConfirm: userData.needsNameConfirmation,
                      }
                }
                trailing={
                  <Activity mode={timeUntilStart ? "visible" : "hidden"}>
                    <EventStartCountdownBadge
                      formatted={timeUntilStart?.formatted}
                    />
                  </Activity>
                }
              />
            </>
          }
          rightColumn={null}
        />

        <Activity mode={!!timeRemaining ? "visible" : "hidden"}>
          <CompactRegistrationDeadlineBanner
            icon={Hourglass}
            title={
              <>
                Registration closes in{" "}
                <span className="text-primary font-bold">
                  {timeRemaining?.formatted}
                </span>
              </>
            }
            subtitle="Secure your spot before it's too late!"
          />
        </Activity>

        <Activity
          mode={
            !timeRemaining && event.registration_deadline ? "visible" : "hidden"
          }
        >
          <CompactRegistrationDeadlineBanner
            icon={CalendarClock}
            iconClassName="h-3.5 w-3.5 text-muted-foreground"
            title={<>Registration closes {registrationDeadlineFormatted}</>}
            subtitle="Don't miss out!"
          />
        </Activity>

        <RegistrationPriceLine event={event} />

        <RegisterButton
          hasCustomQuestions={hasCustomQuestions}
          registerUrl={registerUrl}
          isRegistering={isRegistering}
          isPaid={isPaidEvent(event)}
          eventTrackingContext={eventTrackingContext}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RegistrationPriceLine event={event} />
      <Button asChild className="w-full" size="lg">
        <Link to={registerUrl}>
          {isPaidEvent(event) ? "Buy ticket" : "Register for Event"}
        </Link>
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          onClick={() => {
            window.localStorage.setItem(
              "post_login_return_to",
              Routes.community.event(community.slug, publicEventSlug(event)),
            );
          }}
          className="underline hover:text-foreground font-medium"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
