import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { Spinner } from "~/shared/components/ui/spinner";
import type { UTMAttribution } from "~/modules/events/utils/utm-source";
import { FEATURE_OPTIONS } from "~/modules/mobile-app/model/mobile-app-waitlist";
import type { MobileAppActionData } from "~/modules/mobile-app/server/mobile-app-action.server";
import type { MobileAppLoaderData } from "~/modules/mobile-app/server/mobile-app-loader.server";
import * as MobileAppAnalytics from "~/modules/mobile-app/utils/mobile-app-analytics";

// M6/M8 exit: the leaving state fades for this long before the next one mounts.
const LEAVE_MS = 120;

type Joined = { signupId: string; answered: string | boolean; fresh: boolean };

type WaitlistCardProps = Pick<MobileAppLoaderData, "user" | "joined" | "utm">;

/** Fades the current content out, then swaps to `next` (motion M6 and M8 exits). */
function useLeaveThenSwap<T>(next: T): { shown: T; leaving: boolean } {
  const [shown, setShown] = useState(next);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (next === shown) return;
    setLeaving(true);
    const timer = setTimeout(() => {
      setShown(next);
      setLeaving(false);
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [next, shown]);

  return { shown, leaving };
}

/** Long emails keep their domain: "ali.aliyev.work…@gmail.com". */
function shortenEmail(email: string): string {
  if (email.length <= 32) return email;
  const domain = email.slice(email.lastIndexOf("@"));
  // A domain too long to keep whole falls back to a plain cut.
  if (domain.length > 20 || domain.length === email.length) return `${email.slice(0, 31)}…`;
  return `${email.slice(0, 31 - domain.length)}…${domain}`;
}

const enter = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;

export function WaitlistCard({ user, joined: joinedOnLoad, utm }: WaitlistCardProps) {
  const actionData = useActionData<MobileAppActionData>();
  const navigation = useNavigation();
  const intent = navigation.formData?.get("intent");
  // Through the loader revalidation too, so the spinner never flips back to the label.
  const isJoining = navigation.state !== "idle" && intent === "join";

  const [joined, setJoined] = useState<Joined | null>(() => {
    // Without JS the result arrives server-rendered, so seed from it as well.
    if (actionData?.intent === "join" && actionData.ok) {
      return { signupId: actionData.signupId, answered: false, fresh: true };
    }
    if (actionData?.intent === "answer" && actionData.ok) {
      return { signupId: "", answered: true, fresh: false };
    }
    return joinedOnLoad
      ? { signupId: joinedOnLoad.signupId, answered: joinedOnLoad.answered, fresh: false }
      : null;
  });
  const [answer, setAnswer] = useState<string | null>(null);
  const focusTracked = useRef(false);

  useEffect(() => {
    if (!actionData) return;
    if (actionData.intent === "join") {
      if (actionData.ok) {
        MobileAppAnalytics.trackSignupSucceeded(Boolean(user), utm.utmContent);
        setJoined({ signupId: actionData.signupId, answered: false, fresh: true });
      } else {
        MobileAppAnalytics.trackSignupFailed(actionData.reason);
      }
    } else if (actionData.ok && answer) {
      MobileAppAnalytics.trackFeatureAnswered(answer);
      setJoined((current) => current && { ...current, answered: answer });
    }
    // Only react to a new action result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionData]);

  const phase = joined ? "success" : "form";
  const { shown, leaving } = useLeaveThenSwap(phase);
  const error = actionData?.intent === "join" && !actionData.ok ? actionData.error : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center">
      {shown === "form" ? (
        <Form
          method="post"
          preventScrollReset
          onSubmit={() => MobileAppAnalytics.trackSignupSubmitted(Boolean(user))}
          data-leaving={leaving ? "" : undefined}
          className="waitlist-leave flex w-full flex-col items-center gap-3"
        >
          <input type="hidden" name="intent" value="join" />
          {/* Honeypot: hidden from people and assistive tech, filled by bots. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute -left-[9999px] h-px w-px opacity-0"
          />
          <input type="hidden" name="utm_source" value={utm.utmSource} />
          {utm.utmMedium && <input type="hidden" name="utm_medium" value={utm.utmMedium} />}
          {utm.utmCampaign && <input type="hidden" name="utm_campaign" value={utm.utmCampaign} />}
          {utm.utmContent && <input type="hidden" name="utm_content" value={utm.utmContent} />}
          {utm.utmTerm && <input type="hidden" name="utm_term" value={utm.utmTerm} />}

          {!user && (
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label="Email"
              aria-invalid={error ? true : undefined}
              aria-describedby="waitlist-message"
              placeholder="Your email address"
              required
              maxLength={320}
              readOnly={isJoining}
              onFocus={() => {
                if (focusTracked.current) return;
                focusTracked.current = true;
                MobileAppAnalytics.trackEmailFocused();
              }}
              className="h-12 w-full max-w-sm rounded-full border border-foreground/10 bg-white/70 px-5 text-center text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-primary/20 aria-invalid:border-destructive/50 md:text-sm"
            />
          )}

          {/* Same pill as BookACallButton: #FF6D23, its shadow, label then an arrow circle. */}
          <button
            type="submit"
            disabled={isJoining}
            data-state={isJoining ? "submitting" : "idle"}
            className="waitlist-press waitlist-button group inline-flex items-center gap-3 rounded-full bg-[#FF6D23] py-2 pl-7 pr-2 text-base text-white shadow-[0px_2px_8px_rgba(255,109,35,0.4),0px_1px_2px_rgba(0,0,0,0.06)] disabled:cursor-default"
          >
            <span className="waitlist-swap grid place-items-center">
              <span data-part="label">Notify me</span>
              <span data-part="busy" aria-hidden>
                <Spinner className="size-4" />
              </span>
            </span>
            <span className="flex size-8 items-center justify-center rounded-full bg-white/20">
              <ArrowRight aria-hidden className="waitlist-arrow size-4" />
            </span>
          </button>

          <p
            id="waitlist-message"
            aria-live="polite"
            className="min-h-5 max-w-sm text-center text-xs text-muted-foreground"
          >
            {error ? (
              <span
                key={error}
                data-variant="error"
                className="waitlist-enter block text-sm text-destructive"
              >
                {error}
              </span>
            ) : user?.email ? (
              <>We'll send updates to {shortenEmail(user.email)}.</>
            ) : (
              "Weekly build updates from Ali. Unsubscribe anytime."
            )}
          </p>
        </Form>
      ) : joined ? (
        <SuccessState joined={joined} answer={answer} onAnswer={setAnswer} />
      ) : null}
    </div>
  );
}

function SuccessState({
  joined,
  answer,
  onAnswer,
}: {
  joined: Joined;
  answer: string | null;
  onAnswer: (feature: string) => void;
}) {
  const navigation = useNavigation();
  const isAnswering =
    navigation.state !== "idle" && navigation.formData?.get("intent") === "answer";
  const answeredWith = typeof joined.answered === "string" ? joined.answered : null;
  // Answered on an earlier visit: nothing left to ask.
  const showQuestion = !(joined.answered === true);
  // M6 only plays for a signup made in this visit; a returning visitor sees it static.
  const enterClass = joined.fresh ? "waitlist-enter" : "";
  const enterStyle = (i: number) => (joined.fresh ? enter(i) : undefined);

  return (
    <div className="flex w-full flex-col items-center gap-2 text-center" role="status">
      <span
        className={`${enterClass} waitlist-check flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-[0px_2px_8px_rgba(255,109,35,0.4),0px_1px_2px_rgba(0,0,0,0.06)]`}
        style={enterStyle(0)}
      >
        <Check className="size-6" aria-hidden />
      </span>
      <p className={`${enterClass} mt-1 text-lg font-semibold text-foreground`} style={enterStyle(1)}>
        You're on the list
      </p>
      <p className={`${enterClass} text-sm text-muted-foreground lg:text-base`} style={enterStyle(2)}>
        We'll let you know first when the app is ready.
        {joined.fresh && " Check your inbox for a note from Ali."}
      </p>

      {showQuestion && (
        <div className={`${enterClass} mt-5`} style={enterStyle(3)}>
          <Form
            method="post"
            preventScrollReset
            className="flex flex-col items-center gap-3"
            onChange={(event) => {
              if (!(event.target instanceof HTMLInputElement)) return;
              onAnswer(event.target.value);
              event.currentTarget.requestSubmit();
            }}
          >
            <input type="hidden" name="intent" value="answer" />
            <input type="hidden" name="signupId" value={joined.signupId} />
            <fieldset
              className="flex flex-col items-center gap-3"
              disabled={isAnswering || Boolean(answeredWith)}
            >
              {/* M8: the legend and the other chips fade; the chosen chip stays where it is. */}
              <legend
                data-dim={answeredWith ? "" : undefined}
                className="waitlist-dim mb-3 text-sm font-medium text-foreground/70"
              >
                What should the first version have?
              </legend>
              <div className="flex flex-wrap justify-center gap-2">
                {FEATURE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    data-dim={answeredWith && answeredWith !== option.value ? "" : undefined}
                    className="waitlist-dim cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="feature"
                      value={option.value}
                      defaultChecked={option.value === (answeredWith ?? answer)}
                      className="peer sr-only"
                    />
                    <span className="waitlist-press waitlist-chip inline-flex items-center rounded-full border border-primary/15 bg-primary/[0.06] px-4 py-2 text-sm font-medium text-foreground/70 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary/30">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <noscript>
              <button type="submit" className="text-sm text-primary underline">
                Send
              </button>
            </noscript>
          </Form>
          {answeredWith && (
            <p data-variant="note" className="waitlist-enter mt-3 text-sm text-muted-foreground">
              Thanks, noted.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
