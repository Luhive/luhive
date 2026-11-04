import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useSubmit } from "react-router";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { RegistrationOverlayShell } from "~/modules/events/components/event-register/registration-overlay-shell";
import {
  RegistrationFlow,
  getRegistrationOverlayTitle,
  type RegistrationFlowStep,
} from "~/modules/events/components/registration/registration-flow";
import { CustomQuestionsForm } from "~/modules/events/components/registration/custom-questions-form";
import { HackathonRegisterChoice } from "~/modules/events/components/event-register/hackathon-register-choice";
import { hasHackathonQuestions } from "~/modules/events/model/hackathon-team";
import { useEventDetailToasts } from "~/modules/events/hooks/use-event-detail-toasts";
import { getEventTrackingContext } from "~/modules/events/utils/event-session-tracker";
import type { Community, Event, Profile } from "~/shared/models/entity.types";
import type { CustomQuestionJson } from "~/modules/events/model/event.types";
import type { EventRegisterInviteLoaderData } from "~/modules/events/server/event-register-loader.server";
import {
  useInvalidateEventRegistrationQuery,
  useRegistrationCacheUpdate,
} from "~/modules/events/hooks/use-event-registration-query";
import { useSetCurrentUserCache } from "~/shared/hooks/use-current-user-query";
import type { OtpVerifySuccessResult } from "~/modules/auth/model/otp.types";

interface EventRegisterViewProps {
  event: Event;
  community: Community;
  hasCustomQuestions: boolean;
  customQuestions: CustomQuestionJson | null;
  userPhone: string | null;
  user: { id: string; email?: string | null } | null;
  userProfile: Profile | null;
  inviteData?: EventRegisterInviteLoaderData | null;
}

export function EventRegisterView({
  event,
  community,
  hasCustomQuestions,
  customQuestions,
  userPhone,
  user,
  userProfile,
  inviteData,
}: EventRegisterViewProps) {
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const updateEventPageCache = useRegistrationCacheUpdate(event.id);
  const invalidateEventRegistration = useInvalidateEventRegistrationQuery(event.id);
  const setCurrentUserCache = useSetCurrentUserCache();
  const lastSubmittedIntentRef = useRef<string | null>(null);
  const [guestStep, setGuestStep] = useState<RegistrationFlowStep>("form");

  const isInviteMode = Boolean(inviteData?.inviteToken);
  const isHackathon = hasHackathonQuestions(customQuestions);
  // Remembered while this page is open, so a Google sign-in (which leaves the
  // site and comes back here) doesn't ask again. Leaving the page forgets it.
  const choiceKey = `luhive_hackathon_start_${event.id}`;
  const [startingTeam, setStartingTeam] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(choiceKey) === "1") setStartingTeam(true);
    } catch {
      // Storage can be blocked; the choice is simply asked again.
    }
    return () => {
      try {
        sessionStorage.removeItem(choiceKey);
      } catch {
        // Nothing to clean up when storage is blocked.
      }
    };
  }, [choiceKey]);
  const setTeamChoice = (start: boolean) => {
    try {
      if (start) sessionStorage.setItem(choiceKey, "1");
      else sessionStorage.removeItem(choiceKey);
    } catch {
      // Storage can be blocked; nothing else depends on it.
    }
    setStartingTeam(start);
  };
  const choosingHackathonPath = isHackathon && !isInviteMode && !startingTeam;

  const eventSlug = publicEventSlug(event);
  const eventPageUrl = Routes.community.event(community.slug, eventSlug);
  const registerPageUrl = Routes.community.eventRegister(
    community.slug,
    eventSlug,
  );
  const trackingContext = useMemo(
    () => getEventTrackingContext(event.id),
    [event.id],
  );

  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";

  const navigateAfterRegistration = () => {
    const separator = eventPageUrl.includes("?") ? "&" : "?";
    navigate(`${eventPageUrl}${separator}registered=1`, { replace: true });
  };

  // Logged-in POST flows: the toasts hook applies the server-returned state.
  useEventDetailToasts({
    eventId: event.id,
    submittedIntentRef: lastSubmittedIntentRef,
    onRegisterSuccess: navigateAfterRegistration,
  });

  // Guest/OTP flows register outside this route's action, so flip the UI
  // from what we know. Skip refetch when OTP already returned full state —
  // an immediate GET would race before new session cookies stick.
  const handleOtpVerified = (result: OtpVerifySuccessResult) => {
    if (result.userProfile) {
      setCurrentUserCache(result.userProfile);
    }
    if (result.registrationState) {
      updateEventPageCache(result.registrationState, { revalidate: false });
    } else {
      invalidateEventRegistration();
    }
  };

  const handleRegistrationSuccess = (result?: OtpVerifySuccessResult) => {
    if (result?.userProfile) {
      setCurrentUserCache(result.userProfile);
    }

    if (result?.registrationState) {
      updateEventPageCache(result.registrationState, { revalidate: false });
    } else {
      updateEventPageCache({
        isUserRegistered: true,
        userRegistrationStatus: event.is_approve_required
          ? "pending"
          : "approved",
      });
    }

    navigateAfterRegistration();
  };

  const handleCustomQuestionsSubmit = (answers: Record<string, unknown>) => {
    lastSubmittedIntentRef.current = isInviteMode
      ? "accept-invite"
      : "register";

    const formData = new FormData();
    formData.append("intent", isInviteMode ? "accept-invite" : "register");
    formData.append("custom_answers", JSON.stringify(answers));

    if (isInviteMode && inviteData?.inviteToken) {
      formData.append("inviteToken", inviteData.inviteToken);
    } else {
      formData.append("eventSessionId", trackingContext.sessionId);
      formData.append("eventUtmSource", trackingContext.utmSource);
      if (trackingContext.utmMedium)
        formData.append("eventUtmMedium", trackingContext.utmMedium);
      if (trackingContext.utmCampaign) {
        formData.append("eventUtmCampaign", trackingContext.utmCampaign);
      }
      if (trackingContext.utmContent) {
        formData.append("eventUtmContent", trackingContext.utmContent);
      }
      if (trackingContext.utmTerm)
        formData.append("eventUtmTerm", trackingContext.utmTerm);
      formData.append(
        "eventFirstVisitStartedAt",
        trackingContext.firstVisitStartedAt,
      );
    }

    submit(formData, { method: "POST" });
  };

  const showCustomQuestionsForm =
    isInviteMode ||
    (Boolean(user) && hasCustomQuestions && guestStep !== "otp");

  const overlayTitle = choosingHackathonPath
    ? "How are you joining?"
    : isInviteMode
    ? "Complete your registration"
    : showCustomQuestionsForm
      ? "Tell us more"
      : getRegistrationOverlayTitle(guestStep);

  const inviteDisplayName =
    inviteData?.inviteeName || userProfile?.full_name || undefined;
  const inviteDisplayEmail =
    inviteData?.inviteeEmail || user?.email || undefined;
  const registrationForm = showCustomQuestionsForm ? (
    <CustomQuestionsForm
      open
      onOpenChange={() => {}}
      eventId={event.id}
      customQuestions={customQuestions}
      userName={inviteDisplayName}
      userEmail={inviteDisplayEmail}
      userAvatarUrl={userProfile?.avatar_url || undefined}
      userPhone={userPhone ?? undefined}
      onSubmit={handleCustomQuestionsSubmit}
      isSubmitting={isSubmitting}
      variant="overlay"
    />
  ) : (
    <RegistrationFlow
      eventId={event.id}
      eventSlug={eventSlug}
      communitySlug={community.slug}
      communityId={community.id}
      communityName={community.name}
      hasCustomQuestions={hasCustomQuestions}
      customQuestions={customQuestions}
      userPhone={userPhone}
      returnTo={registerPageUrl}
      trackingContext={trackingContext}
      registerActionUrl={registerPageUrl}
      onSuccess={handleRegistrationSuccess}
      onOtpVerified={handleOtpVerified}
      onStepChange={setGuestStep}
      variant="overlay"
    />
  );

  return (
    <RegistrationOverlayShell title={overlayTitle} onCloseHref={eventPageUrl}>
      {choosingHackathonPath ? (
        <HackathonRegisterChoice onStartTeam={() => setTeamChoice(true)} />
      ) : (
        <>
          {isHackathon && !isInviteMode && guestStep !== "otp" ? (
            <p className="mb-4 rounded-md bg-muted px-3 py-2.5 text-sm">
              You're starting a team as its captain. Right after registering, you can invite
              your teammates.{" "}
              <button
                type="button"
                onClick={() => setTeamChoice(false)}
                className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
              >
                Joining a team instead?
              </button>
            </p>
          ) : null}
          {registrationForm}
        </>
      )}
    </RegistrationOverlayShell>
  );
}
