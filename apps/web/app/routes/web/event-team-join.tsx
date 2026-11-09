export { loader, action } from "~/modules/events/server/event-team-join.server";

import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useLocation, useNavigate } from "react-router";
import { RegistrationFlow } from "~/modules/events/components/registration/registration-flow";
import {
  CustomQuestionFields,
  type CustomQuestionFormAnswers,
} from "~/modules/events/components/registration/custom-question-fields";
import {
  buildCustomAnswersFromFormState,
  formatPhoneInputOnBlur,
  normalizePhoneInput,
  phoneInputError,
  validateCustomAnswers,
} from "~/modules/events/utils/custom-questions";
import { Button } from "~/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import {
  EditableName,
  checkEditedName,
} from "~/modules/events/components/registration/editable-name";
import type { DropdownOption } from "~/modules/events/model/event.types";
import { Routes } from "~/shared/lib/routing/routes";
import type { loader as teamJoinLoader } from "~/modules/events/server/event-team-join.server";

type JoinActionData = { success?: boolean; error?: string; teamName?: string };

export default function EventTeamJoinPage() {
  const data = useLoaderData<typeof teamJoinLoader>();
  const fetcher = useFetcher<JoinActionData>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<CustomQuestionFormAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState(data.userPhone ?? "");
  const [editedName, setEditedName] = useState<string | null>(null);

  function clearError(key: string) {
    setErrors(({ [key]: _removed, ...rest }) => rest);
  }
  // Fixed at first render. Signing in through the code reloads this page's data
  // as signed in; switching forms then would flash the join form right before
  // the redirect.
  const [joinSignedIn] = useState(data.signedIn);
  const location = useLocation();
  const viewerName =
    data.viewer?.fullName?.trim() || data.viewer?.email?.split("@")[0] || "You";
  const registeredEventUrl = `${Routes.community.event(data.communitySlug, data.eventSlug)}?registered=1`;

  function showRegisteredEvent() {
    navigate(registeredEventUrl, { replace: true });
  }

  useEffect(() => {
    if (fetcher.data?.success) showRegisteredEvent();
  }, [fetcher.data]);

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="flex items-center gap-2.5">
        <span className="relative size-6 shrink-0 overflow-hidden rounded-[6px] bg-[#f3f3f4]">
          {data.eventCoverUrl ? (
            <img src={data.eventCoverUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[12px] font-semibold text-[#8c8e9a]">
              {data.eventTitle.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>
        <p className="min-w-0 truncate text-sm text-muted-foreground">{data.eventTitle}</p>
      </div>
      <h1 className="mt-3 text-2xl font-semibold">Join {data.teamName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {data.captainName ? `${data.captainName} invited you to their team` : "You're invited to this team"} for{" "}
        {data.eventTitle}.
      </p>

      {data.closedMessage ? null : (
        <ol className="mt-5 space-y-1.5 rounded-md bg-muted px-4 py-3 text-sm">
          <li>
            <span className="font-medium">1.</span>{" "}
            {joinSignedIn ? "Add" : "Confirm your email and add"} your LinkedIn
            {(data.questions?.custom.length ?? 0) > 1 ? " and answer a few questions." : "."}
          </li>
          <li>
            <span className="font-medium">2.</span> You join the team right away.
          </li>
          <li>
            <span className="font-medium">3.</span> The organizer reviews the whole team. We email you the decision.
          </li>
        </ol>
      )}

      {data.closedMessage ? (
        <p className="mt-6 text-sm">{data.closedMessage}</p>
      ) : joinSignedIn ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const nameCheck = checkEditedName(editedName);
            if (nameCheck.error) {
              setErrors((current) => ({ ...current, fullName: nameCheck.error! }));
              return;
            }
            const built = buildCustomAnswersFromFormState(data.questions, phone, answers);
            const validation = validateCustomAnswers(built, data.questions);
            setErrors(validation.errors);
            if (!validation.valid) return;
            const body = new FormData();
            body.set("customAnswers", JSON.stringify(built));
            if (nameCheck.fullName) body.set("fullName", nameCheck.fullName);
            if (data.inviteId) body.set("teamInviteId", data.inviteId);
            fetcher.submit(body, { method: "post" });
          }}
        >
          {data.viewer ? (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={data.viewer.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {viewerName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <EditableName
                    displayName={viewerName}
                    initialName={data.viewer.fullName ?? undefined}
                    editedName={editedName}
                    onEditedNameChange={(value) => {
                      setEditedName(value);
                      clearError("fullName");
                    }}
                    invalid={!!errors.fullName}
                    disabled={fetcher.state !== "idle"}
                  />
                  {data.viewer.email ? (
                    <p className="truncate text-sm text-muted-foreground">{data.viewer.email}</p>
                  ) : null}
                </div>
              </div>
              {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName}</p> : null}
            </div>
          ) : null}
          <CustomQuestionFields
            customQuestions={data.questions}
            phone={phone}
            customAnswers={answers}
            errors={errors}
            onPhoneChange={(value) => {
              setPhone(normalizePhoneInput(value));
              clearError("phone");
            }}
            onPhoneBlur={() => {
              const error = phoneInputError(phone);
              if (error) {
                setErrors((current) => ({ ...current, phone: error }));
              } else {
                setPhone(formatPhoneInputOnBlur(phone));
              }
            }}
            onAnswerChange={(questionId, value) => {
              setAnswers((current) => ({ ...current, [questionId]: value }));
              clearError(questionId);
            }}
            onMultiCheckboxChange={(questionId, option, checked) => {
              setAnswers((current) => {
                const selected = Array.isArray(current[questionId])
                  ? (current[questionId] as DropdownOption[])
                  : [];
                return {
                  ...current,
                  [questionId]: checked
                    ? [...selected, option]
                    : selected.filter((item) => item.id !== option.id),
                };
              });
              clearError(questionId);
            }}
            isSubmitting={fetcher.state !== "idle"}
          />
          {fetcher.data?.error ? <p className="text-sm text-destructive">{fetcher.data.error}</p> : null}
          <Button type="submit" disabled={fetcher.state !== "idle"}>
            {fetcher.state !== "idle" ? "Joining..." : "Join team"}
          </Button>
        </form>
      ) : (
        <div className="mt-6">
          <RegistrationFlow
            eventId={data.eventId}
            eventSlug={data.eventSlug}
            communitySlug={data.communitySlug}
            communityId={data.communityId}
            communityName={data.communityName}
            hasCustomQuestions={Boolean(data.questions?.custom.length)}
            customQuestions={data.questions}
            teamCode={data.teamCode}
            teamInviteId={data.inviteId ?? undefined}
            defaultEmail={data.invitedEmail ?? undefined}
            // Google sign-in comes back here, so the person joins this team.
            returnTo={`${location.pathname}${location.search}`}
            onSuccess={showRegisteredEvent}
          />
        </div>
      )}
    </main>
  );
}
