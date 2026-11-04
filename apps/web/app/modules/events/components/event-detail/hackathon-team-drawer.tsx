import { useState } from "react";
import { Ellipsis } from "lucide-react";
import { HackathonTeamBuilder } from "./hackathon-team-builder";
import {
  useHackathonTeamMutation,
  useHackathonTeamQuery,
} from "~/modules/events/hooks/use-hackathon-team-query";
import type {
  HackathonInvite,
  HackathonMember,
  HackathonTeamDetails,
} from "~/modules/events/model/hackathon-team";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import { cn } from "~/shared/lib/utils/cn";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/shared/components/ui/drawer";
import { Separator } from "~/shared/components/ui/separator";
import { Skeleton } from "~/shared/components/ui/skeleton";
import { useIsMobile } from "~/shared/hooks/use-mobile";

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

function linkedinLabel(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

function TeamDrawerSkeleton() {
  return (
    <>
      <DrawerHeader className="text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
        <Skeleton className="h-5 w-32" aria-hidden />
        <Skeleton className="h-4 w-56" aria-hidden />
      </DrawerHeader>
      <div className="flex-1 space-y-4 px-4 pb-4" aria-busy="true">
        <span className="sr-only">Loading team</span>
        <ul className="space-y-3">
          {["w-28", "w-36"].map((nameWidth) => (
            <li key={nameWidth} className="flex items-center gap-3" aria-hidden>
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className={`h-3.5 ${nameWidth}`} />
                <Skeleton className="h-3 w-40" />
              </div>
            </li>
          ))}
        </ul>
        <Separator />
        <Skeleton className="h-4 w-36" aria-hidden />
      </div>
    </>
  );
}

const ROW_ACTION_CLASS =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted data-[state=open]:text-foreground disabled:pointer-events-none";

function RolePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium text-foreground">
      {children}
    </span>
  );
}

type RowAction = { label: string; onSelect: () => void; destructive?: boolean };

function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  if (actions.length === 0) return <span className="size-8 shrink-0" aria-hidden />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={label} className={ROW_ACTION_CLASS}>
          <Ellipsis className="size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[80]">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            variant={action.destructive ? "destructive" : "default"}
            onSelect={action.onSelect}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TeamMemberRow({ member, actions }: { member: HackathonMember; actions: RowAction[] }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {initials(member.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.name}
          {member.isViewer ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
        </p>
        {member.linkedinUrl ? (
          <a
            href={member.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {linkedinLabel(member.linkedinUrl)}
          </a>
        ) : null}
      </div>
      <RolePill>{member.role === "captain" ? "Captain" : "Member"}</RolePill>
      <RowActions label={`Actions for ${member.name}`} actions={actions} />
    </li>
  );
}

function InvitedRow({
  invite,
  cancelling,
  onCancel,
}: {
  invite: HackathonInvite;
  cancelling: boolean;
  onCancel: (() => void) | null;
}) {
  return (
    <li className={cn("flex items-center gap-3 py-2.5", cancelling && "opacity-50")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed text-xs font-medium text-muted-foreground">
        {initials(invite.email)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
        <p className="truncate text-xs text-muted-foreground">Waiting to join</p>
      </div>
      <RolePill>Invited</RolePill>
      <RowActions
        label={`Actions for ${invite.email}`}
        actions={onCancel ? [{ label: "Cancel invite", onSelect: onCancel, destructive: true }] : []}
      />
    </li>
  );
}

function TeamDetails({
  team,
  teamName,
  eventId,
  onLeft,
}: {
  team: HackathonTeamDetails;
  teamName: string;
  eventId: string;
  onLeft: () => void;
}) {
  const [prompt, setPrompt] = useState<{ member: HackathonMember; intent: "leave" | "assign" | "remove" } | null>(null);
  const [nextCaptainId, setNextCaptainId] = useState("");
  const mutation = useHackathonTeamMutation(eventId);
  const others = team.members.filter((member) => !member.isViewer);
  const leavingAsCaptain = prompt?.intent === "leave" && team.isCaptain && others.length > 0;

  function openPrompt(member: HackathonMember, intent: "leave" | "assign" | "remove") {
    if (mutation.isPending) return;
    mutation.reset();
    setNextCaptainId("");
    setPrompt({ member, intent });
  }

  function openLeave() {
    const self = team.members.find((member) => member.isViewer);
    if (!self) return;
    openPrompt(self, "leave");
  }

  function memberActions(member: HackathonMember): RowAction[] {
    if (!team.canChangeRoster) return [];
    if (member.isViewer) return [{ label: "Leave team", onSelect: openLeave, destructive: true }];
    if (!team.isCaptain) return [];
    return [
      { label: "Make captain", onSelect: () => openPrompt(member, "assign") },
      { label: "Remove", onSelect: () => openPrompt(member, "remove"), destructive: true },
    ];
  }

  function closePrompt() {
    if (mutation.isPending) return;
    setPrompt(null);
  }

  function run(fields: Record<string, string>, left = false) {
    mutation.mutate(fields, {
      onSuccess: () => {
        setPrompt(null);
        if (left) onLeft();
      },
    });
  }

  return (
    <>
      <DrawerHeader className="sr-only">
        <DrawerTitle>{team.name || teamName}</DrawerTitle>
        {team.description ? <DrawerDescription>{team.description}</DrawerDescription> : null}
      </DrawerHeader>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-4">
        {team.isCaptain ? <HackathonTeamBuilder team={team} eventId={eventId} /> : null}
        <section>
          <h3 className="border-b pb-2 text-sm font-medium">
            Team
            <span className="ml-1.5 font-normal text-muted-foreground">
              {team.maxTeamSize != null ? `${team.seatsTaken} of ${team.maxTeamSize}` : team.seatsTaken}
            </span>
          </h3>
          <ul>
            {team.members.map((member) => (
              <TeamMemberRow key={member.id} member={member} actions={memberActions(member)} />
            ))}
            {team.invites.map((invite) => (
              <InvitedRow
                key={invite.id}
                invite={invite}
                cancelling={mutation.isPending && mutation.variables?.inviteId === invite.id}
                onCancel={
                  team.isCaptain
                    ? () => mutation.mutate({ intent: "cancel-invite", inviteId: invite.id })
                    : null
                }
              />
            ))}
          </ul>
          {mutation.isError && prompt === null ? (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          ) : null}
        </section>
      </div>
      <Dialog open={prompt !== null} onOpenChange={(next) => { if (!next) closePrompt(); }}>
        <DialogContent
          className="z-[80]"
          showCloseButton={!mutation.isPending}
          onEscapeKeyDown={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {prompt?.intent === "assign"
                ? `Make ${prompt.member.name} captain?`
                : prompt?.intent === "remove"
                  ? `Remove ${prompt.member.name}?`
                  : `Leave ${team.name || teamName}?`}
            </DialogTitle>
            <DialogDescription>
              {prompt?.intent === "assign"
                ? "You stay on the team as a member."
                : prompt?.intent === "remove"
                  ? "Their registration for this event is cancelled. They can register again to join or start a team."
                  : leavingAsCaptain
                    ? "Choose who becomes captain. Your registration for this event is cancelled; you can register again any time."
                    : team.isCaptain && others.length === 0
                      ? "The team is removed and your registration for this event is cancelled. You can register again any time."
                      : "Your registration for this event is cancelled. You can register again to join or start a team."}
            </DialogDescription>
          </DialogHeader>
          {leavingAsCaptain ? (
            <fieldset className="space-y-2" disabled={mutation.isPending}>
              <legend className="text-sm font-medium text-foreground">Next captain</legend>
              {others.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="next-captain"
                    value={member.id}
                    checked={nextCaptainId === member.id}
                    onChange={() => setNextCaptainId(member.id)}
                  />
                  {member.name}
                </label>
              ))}
            </fieldset>
          ) : null}
          {mutation.isError ? (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePrompt} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={prompt?.intent === "assign" ? "default" : "destructive"}
              disabled={mutation.isPending || (leavingAsCaptain && !nextCaptainId)}
              onClick={() => {
                if (!prompt) return;
                if (prompt.intent === "leave") {
                  run({ intent: "leave", nextCaptainMemberId: nextCaptainId }, true);
                  return;
                }
                run({ intent: prompt.intent, memberId: prompt.member.id });
              }}
            >
              {prompt?.intent === "assign" ? "Make captain" : prompt?.intent === "remove" ? "Remove" : "Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function HackathonTeamDrawer({
  eventId,
  teamName,
  open,
  onOpenChange,
}: {
  eventId: string;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const direction = isMobile ? "bottom" : "right";
  const teamQuery = useHackathonTeamQuery(open ? eventId : null);

  return (
    <Drawer key={direction} open={open} onOpenChange={onOpenChange} direction={direction}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
        {teamQuery.isPending ? <TeamDrawerSkeleton /> : null}
        {teamQuery.isError ? (
          <p className="px-4 pb-4 text-sm text-destructive">Could not load the team.</p>
        ) : null}
        {teamQuery.data ? (
          <TeamDetails
            team={teamQuery.data}
            teamName={teamName}
            eventId={eventId}
            onLeft={() => onOpenChange(false)}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
