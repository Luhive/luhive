import { useCallback, useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { IconChevronRight, IconDots, IconExternalLink } from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import { Badge } from "~/shared/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import { cn } from "~/shared/lib/utils";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";
import type {
  HackathonApproval,
  HackathonRoster,
  HackathonRosterMember,
  HackathonTeamSummary,
} from "~/modules/events/model/hackathon-team";

type DashboardResponse = { dashboard: HackathonRoster | null; error?: string };
type ActionResponse = { success?: boolean; error?: string };

export function useHackathonDashboard(eventId: string | null, enabled: boolean) {
  const [dashboard, setDashboard] = useState<HackathonRoster | null>(null);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    if (!eventId || !enabled) return;
    try {
      const response = await fetch(
        `/api/events/hackathon?eventId=${encodeURIComponent(eventId)}&view=dashboard`,
      );
      const body = (await response.json()) as DashboardResponse;
      setDashboard(body.dashboard);
    } catch {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [eventId, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { dashboard, loading, reload };
}

const approvalBadge: Record<HackathonApproval, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500 text-white" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-400/50 text-red-800" },
};

function initials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

export function HackathonTeamsSection({
  eventId,
  dashboard,
  loading,
  onChanged,
}: {
  eventId: string;
  dashboard: HackathonRoster | null;
  loading: boolean;
  onChanged: () => void;
}) {
  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg border bg-muted/40" />;
  }
  if (!dashboard) return null;

  if (dashboard.teams.length === 0 && dashboard.unteamed.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
        No teams yet. A team appears here when its captain registers.
      </div>
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-lg border">
      {dashboard.teams.map((team, index) => (
        <TeamRow
          key={team.id}
          eventId={eventId}
          team={team}
          canChangeRoster={dashboard.canChangeRoster}
          defaultOpen={index === 0 || team.approval === "pending"}
          onChanged={onChanged}
        />
      ))}
      {dashboard.unteamed.length > 0 ? <UnteamedRow people={dashboard.unteamed} /> : null}
    </div>
  );
}

function useTeamAction(onChanged: () => void) {
  const fetcher = useFetcher<ActionResponse>();
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.success) onChanged();
    else if (fetcher.data.error) toast.error(fetcher.data.error);
  }, [fetcher.state, fetcher.data]);
  return fetcher;
}

function TeamRow({
  eventId,
  team,
  canChangeRoster,
  defaultOpen,
  onChanged,
}: {
  eventId: string;
  team: HackathonTeamSummary;
  canChangeRoster: boolean;
  defaultOpen: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const decide = useTeamAction(onChanged);
  const badge = approvalBadge[team.approval];
  const deciding = decide.state !== "idle";
  const pendingStatus = deciding ? decide.formData?.get("status") : null;

  function submitDecision(status: "approved" | "rejected") {
    decide.submit(
      { intent: "decide", eventId, teamId: team.id, status },
      { method: "post", action: "/api/events/hackathon" },
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <IconChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
              open && "rotate-90",
            )}
            aria-hidden
          />
          <span className="truncate font-medium">{team.name}</span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {team.members.length} {team.members.length === 1 ? "person" : "people"}
          </span>
          <Badge variant="outline" className={cn("shrink-0 border-transparent font-medium", badge.className)}>
            {badge.label}
          </Badge>
        </button>
        {canChangeRoster && team.approval === "pending" ? (
          <div className="flex gap-2">
            <Button size="sm" disabled={deciding} onClick={() => submitDecision("approved")}>
              {pendingStatus === "approved" ? "Approving..." : "Approve team"}
            </Button>
            <Button size="sm" variant="outline" disabled={deciding} onClick={() => submitDecision("rejected")}>
              {pendingStatus === "rejected" ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        ) : null}
      </div>
      {open ? (
        <div className="mx-4 mb-4 overflow-hidden rounded-md border">
          <div className="border-b bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground">Team plan</p>
            <p className="mt-1 whitespace-pre-line text-sm">{team.description}</p>
          </div>
          <Table>
            <MemberTableHeader />
            <TableBody>
              {team.members.map((member) => (
                <MemberRow
                  key={member.id}
                  eventId={eventId}
                  member={member}
                  canRemove={canChangeRoster && member.role !== "captain"}
                  onChanged={onChanged}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
}

function MemberRow({
  eventId,
  member,
  canRemove,
  onChanged,
}: {
  eventId: string;
  member: HackathonRosterMember;
  canRemove: boolean;
  onChanged: () => void;
}) {
  const remove = useTeamAction(onChanged);
  const removing = remove.state !== "idle";
  const [confirming, setConfirming] = useState(false);

  return (
    <TableRow className={cn(removing && "opacity-50")}>
      <TableCell className="py-1.5 pl-3">
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={member.avatarUrl || ""} alt={member.name} />
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">{initials(member.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{member.name}</span>
          {member.role === "captain" ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">Captain</Badge>
          ) : null}
          {member.checkedIn ? (
            <Badge className="px-1.5 py-0 text-[11px]">Checked in</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="py-1.5 text-muted-foreground">
        <span className="block max-w-40 truncate lg:max-w-64" title={member.email ?? undefined}>
          {member.email ?? "—"}
        </span>
      </TableCell>
      <TableCell className="py-1.5">
        {member.linkedinUrl ? (
          <a
            href={member.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <span className="max-w-28 truncate">
              {ProfileLinks.handle("linkedin", member.linkedinUrl) || "Profile"}
            </span>
            <IconExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="w-10 py-1.5 pr-2 text-right">
        {canRemove ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label={`Actions for ${member.name}`}>
                <IconDots className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                disabled={removing}
                onSelect={() => setConfirming(true)}
              >
                Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove {member.name}?</DialogTitle>
              <DialogDescription>
                Their registration for this event is cancelled. They keep their Luhive account and
                can register again to join or start a team.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirming(false);
                  remove.submit(
                    { intent: "remove", eventId, memberId: member.id },
                    { method: "post", action: "/api/events/hackathon" },
                  );
                }}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

function MemberTableHeader() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="h-8 pl-3 text-xs">Member</TableHead>
        <TableHead className="h-8 text-xs">Email</TableHead>
        <TableHead className="h-8 text-xs">LinkedIn</TableHead>
        <TableHead className="h-8 w-10" />
      </TableRow>
    </TableHeader>
  );
}

function UnteamedRow({ people }: { people: HackathonRoster["unteamed"] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-muted/20">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <IconChevronRight
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-90")}
          aria-hidden
        />
        <span className="font-medium text-muted-foreground">Not on a team</span>
        <span className="text-sm text-muted-foreground">{people.length}</span>
      </button>
      {open ? (
        <div className="mx-4 mb-4 overflow-hidden rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 pl-3 text-xs">Person</TableHead>
                <TableHead className="h-8 text-xs">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.registrationId}>
                  <TableCell className="py-1.5 pl-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={person.avatarUrl || ""} alt={person.name} />
                        <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                          {initials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{person.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 text-muted-foreground">
                    <span className="block max-w-40 truncate lg:max-w-64">{person.email ?? "—"}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
}
