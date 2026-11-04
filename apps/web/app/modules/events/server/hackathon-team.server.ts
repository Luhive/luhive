import { randomBytes, randomUUID } from "node:crypto";
import { logHackathon } from "~/modules/events/server/hackathon-log.server";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";
import * as HackathonTeam from "~/modules/events/model/hackathon-team";
import type {
  CaptainTeam,
  HackathonApproval,
  HackathonEventWindow,
  HackathonMember,
  HackathonRoster,
  HackathonTeamDetails,
  HackathonViewer,
} from "~/modules/events/model/hackathon-team";
import type { CustomQuestionJson } from "~/modules/events/model/event.types";
import type { Json } from "~/shared/models/database.types";
import { getApprovedRegistrationCount } from "~/modules/events/data/registrations-repo.server";
import * as Teams from "~/modules/events/data/hackathon-teams-repo.server";
import type { HackathonEventRecord, HackathonMemberRecord } from "~/modules/events/data/hackathon-teams-repo.server";
import {
  sendEventStatusUpdateEmail,
  sendHackathonTeamInviteEmail,
  sendHackathonTeammateJoinedEmail,
  sendHackathonRemovedFromTeamEmail,
} from "~/shared/lib/email.server";
import { Routes } from "~/shared/lib/routing/routes";
import { getEmailOrigin } from "~/shared/lib/email/unsubscribe-token.server";
import { isUuid, publicEventSlug } from "~/modules/events/utils/event-slug";
import { createServiceRoleClient } from "~/shared/lib/supabase/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

function service() {
  return createServiceRoleClient();
}

export type HackathonResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type TeamIdentity = {
  linkedinUrl: string;
};

function eventWindow(event: HackathonEventRecord): HackathonEventWindow {
  return {
    isHackathon: event.is_hackathon,
    status: event.status,
    startTime: event.start_time,
    endTime: event.end_time,
    registrationDeadline: event.registration_deadline,
  };
}

function fail(error: string): HackathonResult<never> {
  return { ok: false, error };
}

export function readLinkedIn(raw: string): HackathonResult<string> {
  const linkedinUrl = ProfileLinks.url("linkedin", raw);
  if (!linkedinUrl) return fail("Paste a LinkedIn profile link.");
  return { ok: true, value: linkedinUrl };
}

export function readTeamText(name: string, description: string): HackathonResult<{
  name: string;
  description: string;
}> {
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  if (trimmedName.length < 1 || trimmedName.length > 80) {
    return fail("Enter a team name.");
  }
  if (trimmedDescription.length < 1 || trimmedDescription.length > 400) {
    return fail("Enter a short team description.");
  }
  return { ok: true, value: { name: trimmedName, description: trimmedDescription } };
}

function readMaxTeamSize(value: number | null): HackathonResult<number | null> {
  if (value == null) return { ok: true, value: null };
  if (!Number.isInteger(value) || value < 1) {
    return fail("Team size must be a whole number greater than 0.");
  }
  return { ok: true, value };
}

export async function applyEventHackathon(
  eventId: string,
  input: {
    requested: boolean;
    maxTeamSize: number | null;
    priceMinor: number | null;
    registrationType: string | null;
  },
): Promise<HackathonResult<{ isHackathon: boolean }>> {
  const teamCount = await Teams.countEventTeams(eventId);
  const isHackathon = teamCount > 0 ? true : input.requested;
  if (isHackathon && input.priceMinor != null) {
    return fail("Hackathon mode is only available on free events.");
  }
  if (isHackathon && input.registrationType === "external") {
    return fail("Hackathon mode is only available on Luhive registration.");
  }
  const maxTeamSize = readMaxTeamSize(isHackathon ? input.maxTeamSize : null);
  if (!maxTeamSize.ok) return maxTeamSize;

  await Teams.saveHackathonColumns(eventId, {
    is_hackathon: isHackathon,
    max_team_size: maxTeamSize.value,
    ...(isHackathon ? { is_approve_required: true } : {}),
  });

  const { data: current } = await service()
    .from("events")
    .select("custom_questions")
    .eq("id", eventId)
    .maybeSingle();
  const currentQuestions = (current?.custom_questions ?? null) as CustomQuestionJson | null;
  const nextQuestions = isHackathon
    ? HackathonTeam.withTemplate(currentQuestions)
    : HackathonTeam.withoutTemplate(currentQuestions);
  await service()
    .from("events")
    .update({ custom_questions: nextQuestions as Json })
    .eq("id", eventId);

  return { ok: true, value: { isHackathon } };
}

async function registrationStatusById(registrationIds: string[]) {
  const statuses = new Map<string, string | null>();
  if (registrationIds.length === 0) return statuses;
  const { data, error } = await service()
    .from("event_registrations")
    .select("id, approval_status")
    .in("id", registrationIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) statuses.set(row.id, row.approval_status);
  return statuses;
}

async function teamApproval(
  members: HackathonMemberRecord[],
): Promise<HackathonApproval> {
  const statuses = await registrationStatusById(
    members.map((member) => member.registration_id),
  );
  return HackathonTeam.approvalOf(
    members.map((member) => statuses.get(member.registration_id) ?? null),
  );
}

async function rememberPerson(userId: string | null, linkedinUrl: string) {
  if (!userId || !linkedinUrl) return;
  await Teams.recordProfileLinkedIn(userId, linkedinUrl, "");
}

export async function createHackathonTeam(input: {
  eventId: string;
  userId: string;
  name: string;
  description: string;
  linkedinUrl: string;
}): Promise<HackathonResult<{ joinCode: string }>> {
  const text = readTeamText(input.name, input.description);
  if (!text.ok) return text;
  const event = await Teams.findHackathonEvent(input.eventId);
  if (!event) return fail("Event not found.");
  const now = new Date();
  if (!HackathonTeam.canAcceptMembers(eventWindow(event), null, now)) {
    return fail(HackathonTeam.closedMessage(eventWindow(event), now));
  }

  const registrationId = await findRegistrationIdForUser(input.eventId, input.userId);
  if (!registrationId) return fail("Register for the event before you create a team.");

  const existing = await Teams.findMembershipByRegistration(registrationId);
  if (existing) return fail("You are already on a team.");

  const team = await Teams.insertTeam({
    event_id: input.eventId,
    name: text.value.name,
    description: text.value.description,
    join_code: randomBytes(16).toString("base64url"),
  });
  try {
    await Teams.insertMember({
      team_id: team.id,
      registration_id: registrationId,
      role: "captain",
    });
  } catch (error) {
    // A team with no captain would lock the event's hackathon switch; drop it.
    await Teams.deleteTeam(team.id).catch((cleanupError) =>
      logHackathon("error", "start-team:cleanup", { teamId: team.id }, cleanupError),
    );
    logHackathon("error", "start-team:add-captain", { teamId: team.id }, error);
    return fail("Could not create your team. Try again.");
  }
  await rememberPerson(input.userId, input.linkedinUrl);
  return { ok: true, value: { joinCode: team.join_code } };
}

export async function attachRegistrationToTeam(input: {
  joinCode: string;
  /** The invite the person followed, cleared even when they join with another email. */
  inviteId?: string | null;
  registrationId: string;
  userId: string | null;
  linkedinUrl: string;
}): Promise<HackathonResult<{ teamName: string }>> {
  const team = await Teams.findTeamByCode(input.joinCode);
  if (!team) return fail("This join link is not valid.");
  const event = await Teams.findHackathonEvent(team.event_id);
  if (!event) return fail("Event not found.");

  const members = await Teams.listMembersForTeams([team.id]);
  const approval = await teamApproval(members);
  const now = new Date();
  if (!HackathonTeam.canAcceptMembers(eventWindow(event), approval, now)) {
    if (approval === "approved" || approval === "rejected") {
      return fail("This team is no longer accepting people.");
    }
    return fail(HackathonTeam.closedMessage(eventWindow(event), now));
  }
  const existing = await Teams.findMembershipByRegistration(input.registrationId);
  if (existing) {
    if (existing.team_id === team.id) return { ok: true, value: { teamName: team.name } };
    return fail("You are already on a team.");
  }

  // One seat rule everywhere: members plus open invites. The joiner's own
  // invite is their seat, so it doesn't count against them.
  const invites = await Teams.listTeamInvites(team.id);
  const ownInvites = await ownInviteIds(invites, input.userId, input.inviteId ?? null);
  if (
    event.max_team_size != null &&
    members.length + invites.length - ownInvites.length >= event.max_team_size
  ) {
    return fail("This team is full.");
  }

  // Free the joiner's invite seat before taking the member seat; the database
  // counts both when it checks the size.
  await Promise.all(ownInvites.map((id) => Teams.deleteTeamInvite(id)));

  try {
    await Teams.insertMember({
      team_id: team.id,
      registration_id: input.registrationId,
      role: "member",
    });
  } catch (error) {
    // Someone took the last seat between the check above and this insert.
    if (error instanceof Teams.TeamFullError) return fail("This team is full.");
    throw error;
  }
  await rememberPerson(input.userId, input.linkedinUrl);
  await notifyCaptainOfJoin(team, event, input.registrationId).catch((error) =>
    logHackathon("error", "email:teammate-joined", { teamId: team.id }, error),
  );
  return { ok: true, value: { teamName: team.name } };
}

/** The invites that belong to the joiner: the one they followed, or one sent to their email. */
async function ownInviteIds(
  invites: Array<{ id: string; email: string }>,
  userId: string | null,
  inviteId: string | null,
) {
  let email: string | null = null;
  if (userId) {
    const { data } = await service().auth.admin.getUserById(userId);
    email = data.user?.email?.toLowerCase() ?? null;
  }
  return invites
    .filter((invite) => (inviteId && isUuid(inviteId) && invite.id === inviteId) || invite.email === email)
    .map((invite) => invite.id);
}

async function notifyCaptainOfJoin(
  team: { id: string; name: string },
  event: HackathonEventRecord,
  memberRegistrationId: string,
) {
  const members = await Teams.listMembersForTeams([team.id]);
  const captain = members.find((member) => member.role === "captain");
  if (!captain) return;
  const [people, contacts, invites, { data: community }] = await Promise.all([
    loadPeople([memberRegistrationId]),
    loadContacts([captain.registration_id]),
    Teams.listTeamInvites(team.id),
    service().from("communities").select("slug, name").eq("id", event.community_id).maybeSingle(),
  ]);
  const captainEmail = contacts.get(captain.registration_id)?.email;
  if (!captainEmail || !community) return;
  const taken = members.length + invites.length;
  await sendHackathonTeammateJoinedEmail({
    eventTitle: event.title,
    communityName: community.name,
    teamName: team.name,
    memberName: people.get(memberRegistrationId)?.name || "Someone",
    teamCount: event.max_team_size != null ? `${taken} of ${event.max_team_size}` : String(taken),
    teamLink: Routes.absolute(
      getEmailOrigin(),
      Routes.community.event(community.slug, publicEventSlug(event)),
    ),
    recipientEmail: captainEmail,
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readInvitees(emails: unknown[]): HackathonResult<string[]> {
  const invitees = new Set<string>();
  for (const value of emails) {
    const email = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!email) continue;
    if (!EMAIL_PATTERN.test(email)) return fail(`Check this email: ${email}`);
    invitees.add(email);
  }
  if (invitees.size === 0) return fail("Add at least one teammate.");
  if (invitees.size > HackathonTeam.MAX_INVITES_PER_REQUEST) {
    return fail(`Invite up to ${HackathonTeam.MAX_INVITES_PER_REQUEST} people at a time.`);
  }
  return { ok: true, value: [...invitees] };
}

/** The viewer's captain membership on this event, with the team and event it belongs to. */
async function captainTeam(eventId: string, userId: string) {
  const registrationId = await findRegistrationIdForUser(eventId, userId);
  if (!registrationId) return fail("You are not registered for this event.");
  const membership = await Teams.findMembershipByRegistration(registrationId);
  if (!membership || membership.role !== "captain") {
    return fail("Only the captain can invite teammates.");
  }
  const team = await Teams.findTeamById(membership.team_id);
  const event = await Teams.findHackathonEvent(eventId);
  if (!team || !event) return fail("Team not found.");
  return { ok: true as const, value: { team, event } };
}

export async function inviteHackathonTeammates(input: {
  eventId: string;
  userId: string;
  emails: unknown[];
  origin: string;
}): Promise<HackathonResult<{ sent: number; alreadyOnTeam: string[] }>> {
  const invitees = readInvitees(input.emails);
  if (!invitees.ok) return invitees;
  const captain = await captainTeam(input.eventId, input.userId);
  if (!captain.ok) return captain;
  const { team, event } = captain.value;

  const members = await Teams.listMembersForTeams([team.id]);
  const approval = await teamApproval(members);
  const now = new Date();
  if (!HackathonTeam.canAcceptMembers(eventWindow(event), approval, now)) {
    if (approval === "approved" || approval === "rejected") {
      return fail("This team is no longer accepting people.");
    }
    return fail(HackathonTeam.closedMessage(eventWindow(event), now));
  }

  const contacts = await loadContacts(members.map((member) => member.registration_id));
  const memberEmails = new Set(
    [...contacts.values()].flatMap((contact) => (contact.email ? [contact.email.toLowerCase()] : [])),
  );
  const alreadyOnTeam = invitees.value.filter((email) => memberEmails.has(email));
  const toInvite = invitees.value.filter((email) => !memberEmails.has(email));

  if (event.max_team_size != null) {
    const invited = await Teams.listTeamInvites(team.id);
    const invitedEmails = new Set(invited.map((invite) => invite.email));
    const newSeats = toInvite.filter((email) => !invitedEmails.has(email)).length;
    if (members.length + invited.length + newSeats > event.max_team_size) {
      return fail(`A team can have up to ${event.max_team_size} people, counting invites.`);
    }
  }

  if (toInvite.length > 0) {
    const { data: community } = await service()
      .from("communities")
      .select("slug, name")
      .eq("id", event.community_id)
      .maybeSingle();
    if (!community) return fail("Community not found.");
    const captainName = (await findTeamCaptainName(team.id)) || "Your captain";
    const joinLink = Routes.absolute(
      input.origin,
      Routes.community.eventTeamJoin(community.slug, event.slug, team.join_code),
    );
    const eventDate = dayjs(event.start_time).tz(event.timezone);

    for (const email of toInvite) {
      let invite: { id: string };
      try {
        invite = await Teams.saveTeamInvite({ team_id: team.id, email });
      } catch (error) {
        if (error instanceof Teams.TeamFullError) {
          return fail(`A team can have up to ${event.max_team_size} people, counting invites.`);
        }
        throw error;
      }
      try {
        await sendHackathonTeamInviteEmail({
          eventTitle: event.title,
          communityName: community.name,
          teamName: team.name,
          recipientEmail: email,
          // The invite id lets the join page prefill this email without putting it in the URL.
          joinLink: `${joinLink}?invite=${invite.id}`,
          captainName,
          eventDate: eventDate.format("dddd, MMMM D, YYYY"),
          eventTime: eventDate.format("h:mm A z"),
        });
      } catch (error) {
        logHackathon("error", "email:invite", { teamId: team.id }, error);
        return fail(`Could not send the invite to ${email}. Try again.`);
      }
    }
  }

  return {
    ok: true,
    value: { sent: toInvite.length, alreadyOnTeam },
  };
}

export async function cancelHackathonInvite(input: {
  eventId: string;
  userId: string;
  inviteId: string;
}): Promise<HackathonResult<true>> {
  const captain = await captainTeam(input.eventId, input.userId);
  if (!captain.ok) return captain;
  const invite = await Teams.findTeamInvite(input.inviteId);
  if (!invite || invite.team_id !== captain.value.team.id) return fail("Invite not found.");
  await Teams.deleteTeamInvite(invite.id);
  return { ok: true, value: true };
}

export async function placeHackathonRegistration(input: {
  eventId: string;
  userId: string;
  teamCode?: string | null;
  teamInviteId?: string | null;
  answers: Record<string, unknown> | null;
}): Promise<HackathonResult<true>> {
  const event = await Teams.findHackathonEvent(input.eventId);
  if (!event?.is_hackathon) return { ok: true, value: true };
  const linkedinUrl = HackathonTeam.answerText(
    input.answers,
    HackathonTeam.HackathonQuestionId.LinkedIn,
  );
  if (input.teamCode) {
    const registrationId = await findRegistrationIdForUser(input.eventId, input.userId);
    if (!registrationId) return fail("Could not find your registration.");
    const attached = await attachRegistrationToTeam({
      joinCode: input.teamCode,
      inviteId: input.teamInviteId ?? null,
      registrationId,
      userId: input.userId,
      linkedinUrl,
    });
    return attached.ok ? { ok: true, value: true } : attached;
  }
  const created = await createHackathonTeam({
    eventId: input.eventId,
    userId: input.userId,
    name: HackathonTeam.answerText(input.answers, HackathonTeam.HackathonQuestionId.TeamName),
    description: HackathonTeam.answerText(input.answers, HackathonTeam.HackathonQuestionId.TeamPlan),
    linkedinUrl,
  });
  return created.ok ? { ok: true, value: true } : created;
}

export async function findRegistrationIdForUser(
  eventId: string,
  userId: string,
) {
  const { data, error } = await service()
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function captainMembership(
  teamId: string,
  userId: string,
) {
  const { data: registrations, error } = await service()
    .from("event_registrations")
    .select("id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const ids = (registrations ?? []).map((row) => row.id);
  const memberships = await Teams.listMembersByRegistrationIds(ids);
  return (
    memberships.find((member) => member.team_id === teamId && member.role === "captain") ??
    null
  );
}

export async function removeHackathonMember(
  input: { memberId: string; userId: string; organizerEventId: string | null },
): Promise<HackathonResult<{ registrationId: string }>> {
  const member = await Teams.findMemberById(input.memberId);
  if (!member) return fail("That person is not on a team.");
  if (member.role === "captain") return fail("The captain stays on the team.");

  const team = await Teams.findTeamById(member.team_id);
  if (!team) return fail("Team not found.");
  const asOrganizer = input.organizerEventId === team.event_id;
  const event = await Teams.findHackathonEvent(team.event_id);
  if (!event) return fail("Event not found.");
  const now = new Date();
  if (!HackathonTeam.canChangeRoster(eventWindow(event), now)) {
    return fail(HackathonTeam.closedMessage(eventWindow(event), now));
  }
  if (!asOrganizer) {
    const captain = await captainMembership(team.id, input.userId);
    if (!captain) return fail("Only the captain can remove a teammate.");
  }
  // Read who they are before the registration (and their name on it) is gone.
  const [people, contacts] = await Promise.all([
    loadPeople([member.registration_id]),
    loadContacts([member.registration_id]),
  ]);
  // Nobody stays registered without a team. Their profile and account stay;
  // they can register again to join or start a team.
  await Teams.deleteRegistration(member.registration_id);
  const recipientEmail = contacts.get(member.registration_id)?.email;
  if (recipientEmail) {
    await notifyRemoved({
      team,
      event,
      recipientEmail,
      recipientName: people.get(member.registration_id)?.name || "there",
    }).catch((error) => logHackathon("error", "email:removed", { memberId: member.id }, error));
  }
  return { ok: true, value: { registrationId: member.registration_id } };
}

async function notifyRemoved(input: {
  team: { name: string };
  event: HackathonEventRecord;
  recipientEmail: string;
  recipientName: string;
}) {
  const { data: community } = await service()
    .from("communities")
    .select("slug, name")
    .eq("id", input.event.community_id)
    .maybeSingle();
  if (!community) return;
  await sendHackathonRemovedFromTeamEmail({
    eventTitle: input.event.title,
    communityName: community.name,
    teamName: input.team.name,
    recipientName: input.recipientName,
    eventLink: Routes.absolute(
      getEmailOrigin(),
      Routes.community.event(community.slug, publicEventSlug(input.event)),
    ),
    recipientEmail: input.recipientEmail,
  });
}

async function openRoster(teamId: string) {
  const team = await Teams.findTeamById(teamId);
  if (!team) return fail("Team not found.");
  const event = await Teams.findHackathonEvent(team.event_id);
  if (!event) return fail("Event not found.");
  const now = new Date();
  if (!HackathonTeam.canChangeRoster(eventWindow(event), now)) {
    return fail(HackathonTeam.closedMessage(eventWindow(event), now));
  }
  return { ok: true as const, value: team };
}

async function handCaptainTo(currentCaptainId: string, nextMemberId: string) {
  await Teams.updateMemberRole(currentCaptainId, "member");
  try {
    await Teams.updateMemberRole(nextMemberId, "captain");
  } catch (error) {
    await Teams.updateMemberRole(currentCaptainId, "captain");
    throw error;
  }
}

export async function assignHackathonCaptain(input: { userId: string; memberId: string }) {
  const target = await Teams.findMemberById(input.memberId);
  if (!target) return fail("That person is not on a team.");
  if (target.role === "captain") return fail("They are already the captain.");
  const roster = await openRoster(target.team_id);
  if (!roster.ok) return roster;
  const captain = await captainMembership(target.team_id, input.userId);
  if (!captain) return fail("Only the captain can choose the next captain.");
  await handCaptainTo(captain.id, target.id);
  return { ok: true as const, value: true };
}

export async function leaveHackathonTeam(input: {
  userId: string;
  eventId: string;
  nextCaptainMemberId?: string;
}) {
  const registrationId = await findRegistrationIdForUser(input.eventId, input.userId);
  if (!registrationId) return fail("You are not registered for this event.");
  const membership = await Teams.findMembershipByRegistration(registrationId);
  if (!membership) return fail("You are not on a team.");
  const roster = await openRoster(membership.team_id);
  if (!roster.ok) return roster;

  // Leaving a team cancels the registration too: nobody stays registered
  // without a team. Profile and account stay; they can register again.
  if (membership.role !== "captain") {
    await Teams.deleteRegistration(registrationId);
    return { ok: true as const, value: { left: true } };
  }

  const size = await Teams.countTeamMembers(membership.team_id);
  if (size <= 1) {
    await Teams.deleteTeam(membership.team_id);
    await Teams.deleteRegistration(registrationId);
    return { ok: true as const, value: { left: true } };
  }

  const next = await Teams.findMemberById(input.nextCaptainMemberId?.trim() || "");
  if (!next || next.team_id !== membership.team_id || next.id === membership.id) {
    return fail("Choose a teammate to be the next captain.");
  }
  await handCaptainTo(membership.id, next.id);
  await Teams.deleteRegistration(registrationId);
  return { ok: true as const, value: { left: true } };
}

export async function prepareHackathonCancel(
  eventId: string,
  registrationId: string,
): Promise<HackathonResult<true>> {
  const membership = await Teams.findMembershipByRegistration(registrationId);
  if (!membership) return { ok: true, value: true };
  const event = await Teams.findHackathonEvent(eventId);
  if (!event?.is_hackathon) return { ok: true, value: true };
  const now = new Date();
  if (!HackathonTeam.canChangeRoster(eventWindow(event), now)) {
    return fail(HackathonTeam.closedMessage(eventWindow(event), now));
  }
  if (membership.role === "captain") {
    const size = await Teams.countTeamMembers(membership.team_id);
    if (size > 1) {
      return fail("Remove your teammates before you cancel.");
    }
    await Teams.deleteTeam(membership.team_id);
  }
  return { ok: true, value: true };
}

export async function findHackathonViewer(
  eventId: string,
  userId: string | null,
): Promise<HackathonViewer | null> {
  const event = await Teams.findHackathonEvent(eventId);
  if (!event?.is_hackathon) return null;
  const empty = {
    teamName: null,
    teamPlan: null,
    isCaptain: false,
    joinPath: null,
    acceptingMembers: false,
  };
  if (!userId) return empty;

  const registrationId = await findRegistrationIdForUser(eventId, userId);
  if (!registrationId) return empty;
  const membership = await Teams.findMembershipByRegistration(registrationId);
  if (!membership) return empty;
  const team = await Teams.findTeamById(membership.team_id);
  if (!team) return empty;
  const { data: community } = await service()
    .from("communities")
    .select("slug")
    .eq("id", event.community_id)
    .maybeSingle();
  const approval = await teamApproval(await Teams.listMembersForTeams([team.id]));
  return {
    teamName: team.name,
    teamPlan: team.description,
    isCaptain: membership.role === "captain",
    acceptingMembers: HackathonTeam.canAcceptMembers(eventWindow(event), approval, new Date()),
    joinPath: community
      ? Routes.community.eventTeamJoin(community.slug, event.slug, team.join_code)
      : null,
  };
}

export async function findTeamCaptainName(teamId: string) {
  const members = await Teams.listMembersForTeams([teamId]);
  const captain = members.find((member) => member.role === "captain");
  if (!captain) return null;
  const people = await loadPeople([captain.registration_id]);
  return people.get(captain.registration_id)?.name ?? null;
}

export async function findHackathonDashboard(
  eventId: string,
): Promise<HackathonRoster | null> {
  const event = await Teams.findHackathonEvent(eventId);
  if (!event?.is_hackathon) return null;
  const teams = await Teams.listTeamsForEvent(eventId);
  const members = await Teams.listMembersForTeams(
    teams.map((team) => team.id),
  );
  const statuses = await registrationStatusById(
    members.map((member) => member.registration_id),
  );
  const membersByTeam = new Map<string, HackathonMemberRecord[]>();
  for (const member of members) {
    const list = membersByTeam.get(member.team_id) ?? [];
    list.push(member);
    membersByTeam.set(member.team_id, list);
  }

  const { data: registrations, error } = await service()
    .from("event_registrations")
    .select("id")
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);

  const registrationIds = (registrations ?? []).map((row) => row.id);
  const onTeam = new Set(members.map((member) => member.registration_id));
  const unteamedIds = registrationIds.filter((id) => !onTeam.has(id));
  const [people, contacts] = await Promise.all([
    loadPeople(registrationIds),
    loadContacts(registrationIds),
  ]);

  return {
    canChangeRoster: HackathonTeam.canChangeRoster(eventWindow(event), new Date()),
    teams: teams.map((team) => {
      const roster = membersByTeam.get(team.id) ?? [];
      roster.sort((left, right) => Number(right.role === "captain") - Number(left.role === "captain"));
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        approval: HackathonTeam.approvalOf(
          roster.map((member) => statuses.get(member.registration_id) ?? null),
        ),
        members: roster.map((member) => ({
          ...toDashboardMember(member, people),
          email: contacts.get(member.registration_id)?.email ?? null,
          checkedIn: contacts.get(member.registration_id)?.checkedIn ?? false,
        })),
      };
    }),
    unteamed: unteamedIds.map((id) => ({
      registrationId: id,
      name: people.get(id)?.name || "Unnamed",
      avatarUrl: people.get(id)?.avatarUrl ?? null,
      email: contacts.get(id)?.email ?? null,
    })),
  };
}

async function loadContacts(registrationIds: string[]) {
  const contacts = new Map<string, { email: string | null; checkedIn: boolean }>();
  if (registrationIds.length === 0) return contacts;
  const { data, error } = await service()
    .from("event_registrations")
    .select("id, user_id, anonymous_email, is_attended")
    .in("id", registrationIds);
  if (error) throw new Error(error.message);
  await Promise.all(
    (data ?? []).map(async (row) => {
      let email = row.anonymous_email;
      if (!email && row.user_id) {
        const { data: userData } = await service().auth.admin.getUserById(row.user_id);
        email = userData.user?.email ?? null;
      }
      contacts.set(row.id, { email, checkedIn: row.is_attended ?? false });
    }),
  );
  return contacts;
}

function toDashboardMember(
  member: HackathonMemberRecord,
  people: Map<string, { name: string; avatarUrl: string | null; linkedinUrl: string | null }>,
): HackathonMember {
  const person = people.get(member.registration_id);
  return {
    id: member.id,
    registrationId: member.registration_id,
    role: member.role,
    name: person?.name || "Unnamed",
    avatarUrl: person?.avatarUrl ?? null,
    linkedinUrl: person?.linkedinUrl ?? null,
    isViewer: false,
  };
}

async function loadPeople(registrationIds: string[]) {
  const people = new Map<string, { name: string; avatarUrl: string | null; linkedinUrl: string | null }>();
  if (registrationIds.length === 0) return people;
  const { data, error } = await service()
    .from("event_registrations")
    .select("id, user_id, anonymous_name, custom_answers")
    .in("id", registrationIds);
  if (error) throw new Error(error.message);
  const userIds = (data ?? []).flatMap((row) => (row.user_id ? [row.user_id] : []));
  const names = new Map<string, string>();
  const avatars = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await service()
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    if (profileError) throw new Error(profileError.message);
    for (const profile of profiles ?? []) {
      if (profile.full_name) names.set(profile.id, profile.full_name);
      if (profile.avatar_url) avatars.set(profile.id, profile.avatar_url);
    }
  }
  for (const row of data ?? []) {
    const answers = row.custom_answers as Record<string, unknown> | null;
    const linkedin = HackathonTeam.answerText(answers, HackathonTeam.HackathonQuestionId.LinkedIn);
    people.set(row.id, {
      name: (row.user_id ? names.get(row.user_id) : null) || row.anonymous_name || "Unnamed",
      avatarUrl: row.user_id ? avatars.get(row.user_id) ?? null : null,
      linkedinUrl: linkedin || null,
    });
  }
  return people;
}

export async function findHackathonTeamDetails(
  userId: string,
  eventId: string,
): Promise<HackathonTeamDetails | null> {
  const registrationId = await findRegistrationIdForUser(eventId, userId);
  if (!registrationId) return null;
  const membership = await Teams.findMembershipByRegistration(registrationId);
  if (!membership) return null;
  const team = await Teams.findTeamById(membership.team_id);
  const event = await Teams.findHackathonEvent(eventId);
  if (!team || !event) return null;
  const { data: community } = await service()
    .from("communities")
    .select("slug")
    .eq("id", event.community_id)
    .maybeSingle();
  const members = await Teams.listMembersForTeams([team.id]);
  const people = await loadPeople(members.map((member) => member.registration_id));
  const roster = members.map((member) => ({
    ...toDashboardMember(member, people),
    isViewer: member.registration_id === registrationId,
  }));
  roster.sort((left, right) => Number(right.role === "captain") - Number(left.role === "captain"));
  const isCaptain = membership.role === "captain";
  const [approval, invites] = await Promise.all([
    teamApproval(members),
    Teams.listTeamInvites(team.id),
  ]);
  const now = new Date();
  const canChangeRoster = HackathonTeam.canChangeRoster(eventWindow(event), now);
  return {
    name: team.name,
    description: team.description,
    isCaptain,
    canChangeRoster,
    canAcceptMembers: HackathonTeam.canAcceptMembers(eventWindow(event), approval, now),
    maxTeamSize: event.max_team_size,
    seatsTaken: members.length + invites.length,
    joinPath: community
      ? Routes.community.eventTeamJoin(community.slug, event.slug, team.join_code)
      : null,
    members: roster,
    // Teammates see the count, not who was invited.
    invites: isCaptain ? invites.map((invite) => ({ id: invite.id, email: invite.email })) : [],
  };
}

export async function findCaptainTeamSheet(
  userId: string,
  eventId: string,
): Promise<CaptainTeam | null> {
  const registrationId = await findRegistrationIdForUser(eventId, userId);
  if (!registrationId) return null;
  const membership = await Teams.findMembershipByRegistration(registrationId);
  if (!membership || membership.role !== "captain") return null;
  const team = await Teams.findTeamById(membership.team_id);
  const event = await Teams.findHackathonEvent(eventId);
  if (!team || !event) return null;
  const { data: community } = await service()
    .from("communities")
    .select("slug")
    .eq("id", event.community_id)
    .maybeSingle();
  if (!community) return null;
  const members = await Teams.listMembersForTeams([team.id]);
  const people = await loadPeople(members.map((member) => member.registration_id));
  return {
    teamId: team.id,
    eventId,
    name: team.name,
    description: team.description,
    joinPath: Routes.community.eventTeamJoin(community.slug, event.slug, team.join_code),
    canChangeRoster: HackathonTeam.canChangeRoster(eventWindow(event), new Date()),
    members: members.map((member) => toDashboardMember(member, people)),
  };
}

export async function listCaptainEventIds(userId: string) {
  const { data: registrations, error } = await service()
    .from("event_registrations")
    .select("id, event_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const memberships = await Teams.listMembersByRegistrationIds(
    (registrations ?? []).map((row) => row.id),
  );
  const captainRegistrationIds = new Set(
    memberships.filter((member) => member.role === "captain").map((member) => member.registration_id),
  );
  return (registrations ?? [])
    .filter((row) => captainRegistrationIds.has(row.id))
    .map((row) => row.event_id);
}

export async function decideHackathonTeam(
  input: {
    eventId: string;
    teamId: string;
    status: "approved" | "rejected";
    origin: string;
  },
): Promise<HackathonResult<{ approval: HackathonApproval }>> {
  const team = await Teams.findTeamById(input.teamId);
  if (!team || team.event_id !== input.eventId) return fail("Team not found.");
  const event = await Teams.findHackathonEvent(team.event_id);
  if (!event) return fail("Event not found.");
  const now = new Date();
  if (!HackathonTeam.canChangeRoster(eventWindow(event), now)) {
    return fail(HackathonTeam.closedMessage(eventWindow(event), now));
  }
  const members = await Teams.listMembersForTeams([team.id]);
  if (members.length === 0) return fail("This team has no members.");

  if (input.status === "approved" && event.capacity != null) {
    const statuses = await registrationStatusById(
      members.map((member) => member.registration_id),
    );
    const newlyApproved = members.filter(
      (member) => statuses.get(member.registration_id) !== "approved",
    ).length;
    const approvedCount = await getApprovedRegistrationCount(service(), event.id);
    if (approvedCount + newlyApproved > event.capacity) {
      return fail("Approving this team would fill the event past capacity.");
    }
  }

  const context = await decisionEmailContext(event, input.origin);
  for (const member of members) {
    await setRegistrationApproval({
      registrationId: member.registration_id,
      event,
      status: input.status,
      ...context,
    });
  }
  return { ok: true, value: { approval: input.status } };
}

async function decisionEmailContext(event: HackathonEventRecord, origin: string) {
  const { data: community } = await service()
    .from("communities")
    .select("slug, name")
    .eq("id", event.community_id)
    .maybeSingle();
  const eventDate = dayjs(event.start_time).tz(event.timezone);
  return {
    eventLink: Routes.absolute(
      origin,
      Routes.community.event(community?.slug ?? "community", publicEventSlug(event)),
    ),
    communityName: community?.name || "Community",
    eventDate: eventDate.format("dddd, MMMM D, YYYY"),
    eventTime: eventDate.format("h:mm A z"),
  };
}

async function setRegistrationApproval(
  input: {
    registrationId: string;
    event: HackathonEventRecord;
    status: "approved" | "rejected";
    eventLink: string;
    communityName: string;
    eventDate: string;
    eventTime: string;
  },
) {
  const { data: existing, error: existingError } = await service()
    .from("event_registrations")
    .select("checkin_token, anonymous_name, anonymous_email, user_id")
    .eq("id", input.registrationId)
    .single();
  if (existingError || !existing) return;

  const checkinToken =
    input.status === "approved" && !existing.checkin_token
      ? randomUUID()
      : existing.checkin_token;

  const { error } = await service()
    .from("event_registrations")
    .update({
      approval_status: input.status,
      ...(checkinToken ? { checkin_token: checkinToken } : {}),
    })
    .eq("id", input.registrationId);
  if (error) throw new Error(error.message);

  let recipientEmail = existing.anonymous_email;
  let recipientName = existing.anonymous_name;
  if (!recipientEmail && existing.user_id) {
    const { data: userData } = await service().auth.admin.getUserById(existing.user_id);
    recipientEmail = userData.user?.email ?? null;
    const { data: profile } = await service()
      .from("profiles")
      .select("full_name")
      .eq("id", existing.user_id)
      .maybeSingle();
    recipientName = profile?.full_name || recipientName;
  }

  if (!recipientEmail) return;
  await sendEventStatusUpdateEmail({
    eventTitle: input.event.title,
    communityName: input.communityName,
    eventLink: input.eventLink,
    recipientName: recipientName || "there",
    recipientEmail,
    status: input.status,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    locationAddress: input.event.location_address || undefined,
    onlineMeetingLink: input.event.online_meeting_link || undefined,
    startTimeISO: input.event.start_time,
    endTimeISO: input.event.end_time || input.event.start_time,
    checkinToken,
  });
}

export async function eventSettings(eventId: string) {
  const event = await Teams.findHackathonEvent(eventId);
  const teamCount = await Teams.countEventTeams(eventId);
  return {
    isHackathon: event?.is_hackathon ?? false,
    maxTeamSize: event?.max_team_size ?? null,
    hackathonLocked: teamCount > 0,
  };
}

export async function joinClosedMessage(eventId: string, teamId: string) {
  const event = await Teams.findHackathonEvent(eventId);
  if (!event) return "This join link is not valid.";
  const members = await Teams.listMembersForTeams([teamId]);
  const statuses = await registrationStatusById(members.map((member) => member.registration_id));
  const approval = HackathonTeam.approvalOf(
    members.map((member) => statuses.get(member.registration_id) ?? null),
  );
  const now = new Date();
  const bounds = eventWindow(event);
  if (approval === "approved" || approval === "rejected") {
    return "This team is no longer accepting people.";
  }
  return HackathonTeam.canAcceptMembers(bounds, approval, now)
    ? null
    : HackathonTeam.closedMessage(bounds, now);
}
