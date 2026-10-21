"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { Spinner } from "~/shared/components/ui/spinner";
import { useFetcher, useSubmit } from "react-router";
import { toast } from "sonner";
import * as CommunitySettings from "@luhive/domain/v1/community-settings";
import { OtpInputInline } from "~/modules/auth/components/otp-input-inline";
import {
  CustomQuestionFields,
  REGISTRATION_OVERLAY_FIELD_CLASS,
  type CustomQuestionFormAnswers,
} from "~/modules/events/components/registration/custom-question-fields";
import type { CustomQuestionJson } from "~/modules/events/model/event.types";
import type { CustomAnswerJson } from "~/modules/events/model/event.types";
import type { DropdownOption } from "~/modules/events/model/event.types";
import {
  getEventTrackingContext,
  type EventTrackingContext,
} from "~/modules/events/utils/event-session-tracker";
import {
  buildCustomAnswersFromFormState,
  isValidPhoneNumber,
  normalizePhoneInput,
  validateCustomAnswers,
} from "~/modules/events/utils/custom-questions";
import { cn } from "~/shared/lib/utils/cn";
import { useIsInAppBrowser } from "~/shared/hooks/use-is-in-app-browser";
import { OpenInExternalBrowserLink } from "~/shared/components/open-in-external-browser-link";
import type { OtpVerifySuccessResult } from "~/modules/auth/model/otp.types";
import {
  clearRegistrationOtpDraft,
  findRegistrationOtpDraft,
  saveRegistrationOtpDraft,
} from "~/modules/events/utils/registration-otp-draft";
import * as RegistrationAnalytics from "~/modules/events/utils/registration-analytics";

const EMAIL_EXPAND_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const EMAIL_CONTENT_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const EMAIL_EXPAND_MS = 420;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.843 32.658 29.29 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.676 6.053 29.629 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c10.494 0 19.143-7.656 19.143-20 0-1.341-.147-2.652-.432-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.813C14.297 16.128 18.787 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.676 6.053 29.629 4 24 4 15.316 4 7.954 8.924 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.196 0 9.86-1.992 13.38-5.223l-6.173-5.234C29.093 34.484 26.682 35.5 24 35.5c-5.262 0-9.799-3.507-11.397-8.248l-6.52 5.017C8.704 39.043 15.83 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-1.018 2.977-3.279 5.308-6.093 6.443l.001-.001 6.173 5.234C34.84 40.782 43 36 43 24c0-1.341-.147-2.652-.432-3.917z"
      />
    </svg>
  );
}

type FormValues = { email: string; fullName: string };

export type RegistrationFlowStep = "form" | "otp";

type CheckEmailFetcherData = {
  success?: boolean;
  userExists?: boolean;
  email?: string;
  error?: string;
};

type SignupFetcherData = {
  success?: boolean;
  otpSent?: boolean;
  email?: string;
  error?: string;
};

export interface RegistrationFlowProps {
  eventId: string;
  eventSlug: string;
  communitySlug: string;
  communityId: string;
  communityName: string;
  hasCustomQuestions: boolean;
  customQuestions: CustomQuestionJson | null;
  userPhone?: string | null;
  returnTo?: string;
  trackingContext?: EventTrackingContext;
  registerActionUrl?: string;
  onSuccess: (result?: OtpVerifySuccessResult) => void;
  onOtpVerified?: (result: OtpVerifySuccessResult) => void;
  showStepHeader?: boolean;
  onStepChange?: (step: RegistrationFlowStep) => void;
  variant?: "default" | "overlay";
}

export function getRegistrationStepLabels(step: RegistrationFlowStep) {
  const title =
    step === "otp" ? "Verify your email" : "Register for event";

  const description =
    step === "otp"
      ? null
      : "Enter your details to register for this event.";

  return { title, description };
}

export function getRegistrationOverlayTitle(step: RegistrationFlowStep) {
  if (step === "otp") return "Verify your email";
  return "Register";
}

export function RegistrationFlow({
  eventId,
  communityId,
  hasCustomQuestions,
  customQuestions,
  returnTo,
  trackingContext,
  onSuccess,
  onOtpVerified,
  showStepHeader = false,
  onStepChange,
  variant = "default",
}: RegistrationFlowProps) {
  const isOverlay = variant === "overlay";
  const isInAppBrowser = useIsInAppBrowser();
  const checkEmailFetcher = useFetcher<CheckEmailFetcherData>();
  const signupFetcher = useFetcher<SignupFetcherData>();
  const submit = useSubmit();

  const [step, setStep] = React.useState<RegistrationFlowStep>("form");
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);
  const [userExists, setUserExists] = React.useState<boolean | null>(null);
  const [otpEmail, setOtpEmail] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [questionErrors, setQuestionErrors] = React.useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = React.useState<CustomAnswerJson | null>(null);
  const [phone, setPhone] = React.useState("");
  const [questionFormAnswers, setQuestionFormAnswers] =
    React.useState<CustomQuestionFormAnswers>({});
  const [showEmailSection, setShowEmailSection] = React.useState(false);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const pendingSignupRef = React.useRef<{ email: string; fullName: string } | null>(
    null,
  );
  const signupTriggeredRef = React.useRef(false);

  const form = useForm<FormValues>({
    defaultValues: { email: "", fullName: "" },
  });
  const { ref: emailRegisterRef, ...emailRegisterProps } = form.register("email");

  const isCheckingEmail =
    checkEmailFetcher.state === "submitting" || checkEmailFetcher.state === "loading";
  const isSubmittingSignup =
    signupFetcher.state === "submitting" || signupFetcher.state === "loading";
  const isSubmittingForm = isCheckingEmail || isSubmittingSignup;

  const resolvedTrackingContext = React.useMemo(
    () => trackingContext ?? getEventTrackingContext(eventId),
    [eventId, trackingContext],
  );

  const showOtpStep = React.useCallback(
    (email: string, isExistingUser: boolean) => {
      setOtpEmail(email);
      setStep("otp");
      saveRegistrationOtpDraft(eventId, {
        email,
        fullName: form.getValues("fullName")?.trim() || "",
        userExists: isExistingUser,
        customAnswers,
      });
      RegistrationAnalytics.trackOtpViewed(eventId);
    },
    [customAnswers, eventId, form],
  );

  // In-app browsers often reload the page when the visitor comes back from
  // their mail app, so resume the OTP step instead of starting over.
  React.useEffect(() => {
    const draft = findRegistrationOtpDraft(eventId);
    if (!draft) {
      RegistrationAnalytics.trackFormViewed(eventId);
      return;
    }

    form.setValue("fullName", draft.fullName);
    setUserExists(draft.userExists);
    setCustomAnswers(draft.customAnswers);
    setOtpEmail(draft.email);
    setStep("otp");
  }, [eventId, form]);

  React.useEffect(() => {
    const data = checkEmailFetcher.data;
    if (!data || checkEmailFetcher.state !== "idle") return;

    if (data.userExists) {
      setUserExists(true);
      showOtpStep((data.email || form.getValues("email") || "").trim(), true);
      return;
    }

    if (data.success && !data.userExists) {
      setUserExists(false);
      if (signupTriggeredRef.current) return;
      const pending = pendingSignupRef.current;
      if (!pending) return;

      signupTriggeredRef.current = true;
      pendingSignupRef.current = null;

      const formData = new FormData();
      formData.append("intent", "event-rsvp-signup");
      formData.append("_modal", "true");
      formData.append("fullName", pending.fullName);
      formData.append("email", pending.email);
      formData.append("eventId", eventId);
      formData.append("communityId", communityId);
      signupFetcher.submit(formData, { method: "post", action: "/signup" });
      return;
    }

    if (data.error) {
      setFormError(data.error);
    }
  }, [
    checkEmailFetcher.data,
    checkEmailFetcher.state,
    communityId,
    eventId,
    form,
    showOtpStep,
    signupFetcher.submit,
  ]);

  React.useEffect(() => {
    const data = signupFetcher.data;
    if (!data || signupFetcher.state !== "idle") return;

    if (data.success && data.otpSent) {
      showOtpStep((data.email || form.getValues("email") || "").trim(), false);
      return;
    }

    if (data.error) {
      toast.error(data.error);
    }
  }, [signupFetcher.data, signupFetcher.state, form, showOtpStep]);

  React.useEffect(() => {
    const oauthReturnKey = "luhive_event_oauth_return";

    // Soft/bfcache return from Google: hard-reload once for a clean auth cookie
    // and React state slate before the user continues with email.
    if (sessionStorage.getItem(oauthReturnKey) === "1") {
      sessionStorage.removeItem(oauthReturnKey);
      window.location.reload();
      return;
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && sessionStorage.getItem(oauthReturnKey) === "1") {
        sessionStorage.removeItem(oauthReturnKey);
        window.location.reload();
        return;
      }
      setIsOAuthLoading(false);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleContinueWithGoogle = () => {
    if (isInAppBrowser) return;
    RegistrationAnalytics.trackGoogleClicked(eventId);

    const formData = new FormData();
    formData.append("intent", "oauth");
    formData.append("provider", "google");
    formData.append("eventId", eventId);
    formData.append("communityId", communityId);
    if (returnTo) formData.append("returnTo", returnTo);
    formData.append("eventSessionId", resolvedTrackingContext.sessionId);
    formData.append("eventUtmSource", resolvedTrackingContext.utmSource);
    if (resolvedTrackingContext.utmMedium) {
      formData.append("eventUtmMedium", resolvedTrackingContext.utmMedium);
    }
    if (resolvedTrackingContext.utmCampaign) {
      formData.append("eventUtmCampaign", resolvedTrackingContext.utmCampaign);
    }
    if (resolvedTrackingContext.utmContent) {
      formData.append("eventUtmContent", resolvedTrackingContext.utmContent);
    }
    if (resolvedTrackingContext.utmTerm) {
      formData.append("eventUtmTerm", resolvedTrackingContext.utmTerm);
    }
    formData.append(
      "eventFirstVisitStartedAt",
      resolvedTrackingContext.firstVisitStartedAt,
    );

    sessionStorage.setItem("luhive_event_oauth_return", "1");
    setIsOAuthLoading(true);
    submit(formData, { method: "post", action: "/signup" });
  };

  const handleExpandEmailSection = () => {
    setShowEmailSection(true);
    setFormError(null);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(normalizePhoneInput(value));

    if (questionErrors.phone) {
      setQuestionErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const handlePhoneBlur = () => {
    if (phone && !isValidPhoneNumber(phone)) {
      setQuestionErrors((prev) => ({
        ...prev,
        phone:
          "Please enter a valid phone number in international format (e.g., +994501234567)",
      }));
    }
  };

  const handleQuestionAnswerChange = (
    questionId: string,
    value: string | DropdownOption | DropdownOption[],
  ) => {
    setQuestionFormAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    if (questionErrors[questionId]) {
      setQuestionErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleMultiCheckboxChange = (
    questionId: string,
    option: DropdownOption,
    checked: boolean,
  ) => {
    const current = questionFormAnswers[questionId];
    const currentArray = Array.isArray(current) ? current : [];
    const updated = checked
      ? [...currentArray, option]
      : currentArray.filter((v) => v.id !== option.id);
    handleQuestionAnswerChange(questionId, updated);
  };

  const validateForm = (): { email: string; fullName: string } | null => {
    const rawEmail = form.getValues("email");
    const trimmedEmail = typeof rawEmail === "string" ? rawEmail.trim() : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setFormError("Please enter a valid email address.");
      return null;
    }

    const fullName = form.getValues("fullName")?.trim() || "";
    if (!fullName || fullName.length < 2) {
      setFormError("Please enter your full name.");
      return null;
    }

    form.setValue("email", trimmedEmail, { shouldValidate: true });
    form.setValue("fullName", fullName);

    if (hasCustomQuestions && customQuestions) {
      const answers = buildCustomAnswersFromFormState(
        customQuestions,
        phone,
        questionFormAnswers,
      );
      const validation = validateCustomAnswers(answers, customQuestions);
      if (!validation.valid) {
        setQuestionErrors(validation.errors);
        setFormError(null);
        return null;
      }
      setCustomAnswers(answers);
    } else {
      setCustomAnswers(null);
    }

    setFormError(null);
    setQuestionErrors({});
    return { email: trimmedEmail, fullName };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validated = validateForm();
    if (!validated) return;

    pendingSignupRef.current = validated;
    signupTriggeredRef.current = false;
    RegistrationAnalytics.trackFormSubmitted(eventId);

    const formData = new FormData();
    formData.append("intent", "check-email");
    formData.append("_modal", "true");
    formData.append("email", validated.email);
    checkEmailFetcher.submit(formData, { method: "post", action: "/signup" });
  };

  const handleOtpSuccess = (result: OtpVerifySuccessResult) => {
    clearRegistrationOtpDraft(eventId);
    onOtpVerified?.(result);

    const pendingPayment = result.registrationState?.pendingTicketPayment;
    if (
      pendingPayment?.provider === CommunitySettings.PaymentProvider.Checkila &&
      pendingPayment.paymentUrl
    ) {
      window.location.assign(pendingPayment.paymentUrl);
      return;
    }

    const isRegistered =
      Boolean(result.registeredEvent) ||
      Boolean(result.registrationState?.isUserRegistered);

    if (isRegistered) {
      RegistrationAnalytics.trackCompleted(eventId);
      toast.success("Successfully registered for the event!");
      onSuccess(result);
      return;
    }

    // Auth-only OTP (e.g. custom questions still needed): leave OTP so the
    // parent can show CustomQuestionsForm without a false success navigate.
    setStep("form");
  };

  // Google OAuth is blocked in in-app browsers, so email is the only path there.
  const isEmailFormOpen = showEmailSection || isInAppBrowser;

  const formStepContent = (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      {!isInAppBrowser && (
        <Button
          type="button"
          onClick={handleContinueWithGoogle}
          disabled={isSubmittingForm || isOAuthLoading}
          variant="outline"
          className="w-full hover:bg-muted hover:text-foreground"
          size={isOverlay ? "lg" : "default"}
        >
          {isOAuthLoading ? (
            <Spinner />
          ) : (
            <>
              <GoogleIcon className="mr-1 size-5 shrink-0" />
              Register with Google
            </>
          )}
        </Button>
      )}

      <div className="space-y-0">
        <div
          className={cn(
            "grid motion-reduce:transition-none",
            isEmailFormOpen ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
          )}
          style={{
            transitionProperty: "grid-template-rows",
            transitionDuration: `${EMAIL_EXPAND_MS}ms`,
            transitionTimingFunction: EMAIL_EXPAND_EASE,
          }}
          aria-hidden={isEmailFormOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <p
              className={cn(
                "text-center text-sm text-muted-foreground transition-[opacity,transform] duration-200 motion-reduce:transition-none",
                isEmailFormOpen
                  ? "pointer-events-none -translate-y-1 opacity-0"
                  : "translate-y-0 opacity-100",
              )}
              style={{ transitionTimingFunction: EMAIL_CONTENT_EASE }}
            >
              or with{" "}
              <button
                type="button"
                onClick={handleExpandEmailSection}
                disabled={isSubmittingForm || isOAuthLoading}
                className="underline underline-offset-2 transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                email
              </button>
            </p>
          </div>
        </div>

        <div
          className={cn(
            "grid motion-reduce:transition-none",
            isEmailFormOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
          style={{
            transitionProperty: "grid-template-rows",
            transitionDuration: `${EMAIL_EXPAND_MS}ms`,
            transitionTimingFunction: EMAIL_EXPAND_EASE,
          }}
          aria-hidden={!isEmailFormOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={cn(
                "space-y-5 motion-reduce:transition-none",
                isEmailFormOpen
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0",
              )}
              style={{
                transitionProperty: "opacity, transform",
                transitionDuration: "300ms",
                transitionTimingFunction: EMAIL_CONTENT_EASE,
                transitionDelay: isEmailFormOpen ? "80ms" : "0ms",
              }}
            >
          {!isInAppBrowser && (
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="shrink-0 text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <div className="space-y-2 px-1">
            <Label htmlFor="rsvp-email">
              Email
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="rsvp-email"
              type="email"
              placeholder="you@example.com"
              {...emailRegisterProps}
              ref={(node) => {
                emailRegisterRef(node);
                emailInputRef.current = node;
              }}
              disabled={isSubmittingForm || isOAuthLoading}
              className={isOverlay ? REGISTRATION_OVERLAY_FIELD_CLASS : undefined}
            />
          </div>

          <div className="space-y-2 px-1">
            <Label htmlFor="rsvp-full-name">
              Full Name
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="rsvp-full-name"
              placeholder="John Doe"
              {...form.register("fullName")}
              disabled={isSubmittingForm || isOAuthLoading}
              className={isOverlay ? REGISTRATION_OVERLAY_FIELD_CLASS : undefined}
            />
          </div>

          {hasCustomQuestions && customQuestions ? (
            <div className="px-1">
              <CustomQuestionFields
                customQuestions={customQuestions}
                phone={phone}
                customAnswers={questionFormAnswers}
                errors={questionErrors}
                onPhoneChange={handlePhoneChange}
                onPhoneBlur={handlePhoneBlur}
                onAnswerChange={handleQuestionAnswerChange}
                onMultiCheckboxChange={handleMultiCheckboxChange}
                isOverlay={isOverlay}
                isSubmitting={isSubmittingForm}
                phoneInputId="rsvp-phone"
              />
            </div>
          ) : null}

          {formError && (
            <p className="px-1 text-sm text-destructive">{formError}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmittingForm || isOAuthLoading}
            className="w-full"
            size={isOverlay ? "lg" : "default"}
          >
            {isSubmittingForm ? <Spinner /> : "Register"}
          </Button>

          {isInAppBrowser && (
            <OpenInExternalBrowserLink
              prompt="Prefer Google?"
              label="Open in your browser"
              onOpen={() =>
                RegistrationAnalytics.trackOpenInBrowserClicked(eventId)
              }
            />
          )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );

  const otpStepContent = (
    <div className="space-y-4">
      <OtpInputInline
        email={otpEmail}
        communityId={communityId}
        returnTo={returnTo ?? undefined}
        onSuccess={handleOtpSuccess}
        fullName={
          !userExists ? form.getValues("fullName")?.trim() || undefined : undefined
        }
        eventId={eventId}
        customAnswers={customAnswers ? JSON.stringify(customAnswers) : undefined}
        eventSessionId={resolvedTrackingContext.sessionId}
        eventUtmSource={resolvedTrackingContext.utmSource}
        eventUtmMedium={resolvedTrackingContext.utmMedium}
        eventUtmCampaign={resolvedTrackingContext.utmCampaign}
        eventUtmContent={resolvedTrackingContext.utmContent}
        eventUtmTerm={resolvedTrackingContext.utmTerm}
        eventFirstVisitStartedAt={resolvedTrackingContext.firstVisitStartedAt}
      />
    </div>
  );

  const stepContent = step === "form" ? formStepContent : otpStepContent;
  const { title, description } = getRegistrationStepLabels(step);

  React.useEffect(() => {
    onStepChange?.(step);
  }, [onStepChange, step]);

  React.useEffect(() => {
    if (!showEmailSection || step !== "form") return;

    const timer = window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, EMAIL_EXPAND_MS);

    return () => window.clearTimeout(timer);
  }, [showEmailSection, step]);

  return (
    <div className={cn(isOverlay ? undefined : "space-y-6")}>
      {showStepHeader && !isOverlay && (
        <div className="space-y-1">
          <h2
            className={`text-xl font-semibold ${step === "otp" ? "text-center" : ""}`}
          >
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {stepContent}
    </div>
  );
}
