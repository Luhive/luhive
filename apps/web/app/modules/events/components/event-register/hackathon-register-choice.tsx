import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Link, UsersRound } from "lucide-react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";

const JOIN_PATH = /^\/c\/[^/]+\/[^/]+\/join\/[^/]+\/?$/;

/** Turns a pasted join link into a path on this site, or null when it isn't one. */
function joinPathFrom(text: string) {
  const value = text.trim();
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return JOIN_PATH.test(url.pathname) ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

/**
 * First step of hackathon registration. Without it, a teammate who registers
 * from the event page instead of their captain's link starts a new team.
 */
export function HackathonRegisterChoice({ onStartTeam }: { onStartTeam: () => void }) {
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (joining) {
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const path = joinPathFrom(link);
          if (!path) {
            setError("That isn't a team join link. Ask your captain to send it again.");
            return;
          }
          navigate(path);
        }}
      >
        <div className="space-y-1">
          <h2 className="text-base font-medium">Join your team</h2>
          <p className="text-sm text-muted-foreground">
            Your captain has a join link for the team. Open it, or paste it here.
          </p>
        </div>
        <Input
          aria-label="Team join link"
          placeholder="Paste the join link"
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">
          Open join link
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No team yet?{" "}
          <button
            type="button"
            onClick={onStartTeam}
            className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
          >
            Start one
          </button>
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <ChoiceButton
        icon={<UsersRound className="size-5" aria-hidden />}
        title="Start a team"
        description="You'll be the captain. Name your team, then invite your teammates."
        onClick={onStartTeam}
      />
      <ChoiceButton
        icon={<Link className="size-5" aria-hidden />}
        title="Join a team"
        description="Your captain already started one and has a join link."
        onClick={() => setJoining(true)}
      />
    </div>
  );
}

function ChoiceButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
