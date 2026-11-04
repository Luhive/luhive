export { loader, action } from "~/modules/events/server/event-team-join.server";

import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useLocation, useNavigate } from "react-router";
import { RegistrationFlow } from "~/modules/events/components/registration/registration-flow";
import {
  CustomQuestionFields,
  type CustomQuestionFormAnswers,
} from "~/modules/events/components/registration/custom-question-fields";
import { buildCustomAnswersFromFormState, validateCustomAnswers } from "~/modules/events/utils/custom-questions";
import { Button } from "~/shared/components/ui/button";
import { Routes } from "~/shared/lib/routing/routes";
import type { loader as teamJoinLoader } from "~/modules/events/server/event-team-join.server";

type JoinActionData = { success?: boolean; error?: string; teamName?: string };

export default function EventTeamJoinPage() {
  const data = useLoaderData<typeof teamJoinLoader>();
  const fetcher = useFetcher<JoinActionData>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<CustomQuestionFormAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Fixed at first render. Signing in through the code reloads this page's data
  // as signed in; switching forms then would flash the join form right before
  // the redirect.
  const [joinSignedIn] = useState(data.signedIn);
  const location = useLocation();
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
            const built = buildCustomAnswersFromFormState(data.questions, "", answers);
            const validation = validateCustomAnswers(built, data.questions);
            setErrors(validation.errors);
            if (!validation.valid) return;
            const body = new FormData();
            body.set("customAnswers", JSON.stringify(built));
            if (data.inviteId) body.set("teamInviteId", data.inviteId);
            fetcher.submit(body, { method: "post" });
          }}
        >
          <CustomQuestionFields
            customQuestions={data.questions}
            phone=""
            customAnswers={answers}
            errors={errors}
            onPhoneChange={() => undefined}
            onAnswerChange={(questionId, value) =>
              setAnswers((current) => ({ ...current, [questionId]: value }))
            }
            onMultiCheckboxChange={() => undefined}
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
