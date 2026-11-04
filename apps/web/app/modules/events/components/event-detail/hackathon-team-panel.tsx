import { useEffect, useRef, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import type { HackathonViewer } from "~/modules/events/model/hackathon-team";
import { HackathonTeamDrawer } from "./hackathon-team-drawer";

export function HackathonTeamPanel({
  eventId,
  hackathon,
  autoOpen = false,
}: {
  eventId: string;
  hackathon: HackathonViewer;
  /** Opens the team sheet once, for a captain who just registered. */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hadTeamOnMount = useRef(Boolean(hackathon.teamName));
  const opened = useRef(false);

  // A captain lands here right after registering, either from ?registered=1 or
  // because their team appeared while on the page. Show them the next step once.
  useEffect(() => {
    if (opened.current || !hackathon.isCaptain || !hackathon.teamName || !hackathon.acceptingMembers) {
      return;
    }
    if (autoOpen || !hadTeamOnMount.current) {
      opened.current = true;
      setOpen(true);
    }
  }, [autoOpen, hackathon.isCaptain, hackathon.teamName, hackathon.acceptingMembers]);

  if (!hackathon.teamName) return null;

  const drawer = (
    <HackathonTeamDrawer
      eventId={eventId}
      teamName={hackathon.teamName}
      open={open}
      onOpenChange={setOpen}
    />
  );

  if (hackathon.isCaptain && hackathon.acceptingMembers) {
    return (
      <div className="border-t border-border/60 pt-3 text-sm">
        <div className="flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {hackathon.teamName}
              <span className="ml-1.5 font-normal text-muted-foreground">Captain</span>
            </p>
            <p className="text-muted-foreground">
              Next:{" "}
              <button
                type="button"
                className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setOpen(true)}
              >
                add your teammates
              </button>
              . The organizer reviews the whole team.
            </p>
          </div>
        </div>
        {drawer}
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 pt-3 text-sm">
      <button
        type="button"
        className="group inline-flex max-w-full cursor-pointer items-center gap-2 text-left font-medium text-foreground"
        onClick={() => setOpen(true)}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="size-3.5" aria-hidden />
        </span>
        <span className="inline-flex min-w-0 items-center gap-0.5 truncate group-hover:underline">
          {hackathon.teamName}
          <ChevronRight className="size-3.5 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </button>
      {drawer}
    </div>
  );
}
