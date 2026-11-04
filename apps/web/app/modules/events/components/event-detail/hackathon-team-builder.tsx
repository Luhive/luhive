import { useRef, useState } from "react";
import { Check, Info, Link, X } from "lucide-react";
import { useHackathonTeamMutation } from "~/modules/events/hooks/use-hackathon-team-query";
import {
  MAX_INVITES_PER_REQUEST,
  type HackathonTeamDetails,
} from "~/modules/events/model/hackathon-team";
import { Button } from "~/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/shared/components/ui/tooltip";
import { cn } from "~/shared/lib/utils/cn";

const SEPARATORS = /[\s,;]+/;

function splitEmails(text: string) {
  return text
    .split(SEPARATORS)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/** Captain's tools for filling the team: invite by email, or share the join link. */
export function HackathonTeamBuilder({
  team,
  eventId,
}: {
  team: HackathonTeamDetails;
  eventId: string;
}) {
  const seatsTaken = team.seatsTaken;
  const seatsLeft = team.maxTeamSize == null ? null : Math.max(team.maxTeamSize - seatsTaken, 0);

  if (!team.canAcceptMembers) {
    return (
      <p className="rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        Your team is no longer taking new people.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Invite teammates</h3>
      {seatsLeft === 0 ? (
        <p className="text-sm text-muted-foreground">
          Your team is full. Cancel an invite to add someone else.
        </p>
      ) : (
        <InviteForm
          eventId={eventId}
          maxEmails={Math.min(seatsLeft ?? MAX_INVITES_PER_REQUEST, MAX_INVITES_PER_REQUEST)}
          limitedBySeats={seatsLeft != null && seatsLeft <= MAX_INVITES_PER_REQUEST}
        />
      )}
      {team.joinPath && seatsLeft !== 0 ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <JoinLink joinPath={team.joinPath} />
        </>
      ) : null}
    </section>
  );
}

function InviteForm({
  eventId,
  maxEmails,
  limitedBySeats,
}: {
  eventId: string;
  maxEmails: number;
  /** True when the team's free seats, not the per-request cap, set maxEmails. */
  limitedBySeats: boolean;
}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useHackathonTeamMutation(eventId);
  const full = emails.length >= maxEmails;

  /** Turns finished addresses into chips, up to the seats left. */
  function addEmails(text: string) {
    const parts = splitEmails(text);
    if (parts.length === 0) return;
    setEmails((current) => {
      const next = [...current];
      for (const part of parts) {
        if (next.length >= maxEmails) break;
        if (!next.includes(part)) next.push(part);
      }
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const pending = [...emails, ...splitEmails(draft).filter((email) => !emails.includes(email))];
    if (pending.length === 0) {
      inputRef.current?.focus();
      return;
    }
    addEmails(draft);
    setDraft("");
    mutation.mutate(
      { intent: "invite", emails: JSON.stringify(pending) },
      { onSuccess: () => setEmails([]) },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex min-h-9 min-w-0 flex-1 cursor-text flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 shadow-xs transition-[color,box-shadow]",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            mutation.isPending && "opacity-50",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs"
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                aria-label={`Remove ${email}`}
                disabled={mutation.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  setEmails((current) => current.filter((item) => item !== email));
                }}
                className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            aria-label="Teammate emails"
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder={emails.length === 0 ? "Emails, separated by commas" : full ? "" : "Add more"}
            value={draft}
            disabled={mutation.isPending || full}
            onChange={(event) => {
              const value = event.target.value;
              // A typed or pasted separator finishes every address before it.
              const lastBreak = value.search(/[\s,;][^\s,;]*$/);
              if (lastBreak === -1) {
                setDraft(value);
                return;
              }
              addEmails(value.slice(0, lastBreak));
              setDraft(value.slice(lastBreak + 1));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && draft.trim()) {
                event.preventDefault();
                addEmails(draft);
                setDraft("");
              }
              if (event.key === "Backspace" && !draft && emails.length > 0) {
                setEmails((current) => current.slice(0, -1));
              }
            }}
            onBlur={() => {
              addEmails(draft);
              setDraft("");
            }}
            className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
        </div>
        <Button type="submit" className="h-9 shrink-0" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending..." : "Invite"}
        </Button>
      </div>
      {full ? (
        <p className="text-xs text-muted-foreground">
          {limitedBySeats
            ? maxEmails === 1
              ? "That's the last seat on your team."
              : `That's all ${maxEmails} seats left on your team.`
            : `You can invite up to ${maxEmails} people at a time.`}
        </p>
      ) : null}
      {mutation.isError ? <p className="text-sm text-destructive">{mutation.error.message}</p> : null}
    </form>
  );
}

function JoinLink({ joinPath }: { joinPath: string }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}${joinPath}`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <p className="text-sm">Join link</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="About the join link"
              className="inline-flex cursor-help text-muted-foreground hover:text-foreground"
            >
              <Info className="size-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent className="z-[80] max-w-60">
            Anyone with the link can join until the organizer reviews your team.
          </TooltipContent>
        </Tooltip>
      </div>
      <button
        type="button"
        onClick={() => {
          setCopied(true);
          void navigator.clipboard.writeText(joinUrl);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline",
          copied && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Link className="size-4" aria-hidden />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
