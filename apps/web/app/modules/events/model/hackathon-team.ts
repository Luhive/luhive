import type { CustomQuestion, CustomQuestionJson } from "~/modules/events/model/event.types";

export const HackathonQuestionId = {
  TeamName: "hackathon_team_name",
  TeamPlan: "hackathon_team_plan",
  LinkedIn: "hackathon_linkedin",
} as const;

const hackathonTemplate: CustomQuestion[] = [
  { id: HackathonQuestionId.TeamName, label: "Team name", required: true, order: 0, type: "text" },
  { id: HackathonQuestionId.TeamPlan, label: "Team plan", required: true, order: 1, type: "text" },
  {
    id: HackathonQuestionId.LinkedIn,
    label: "LinkedIn",
    required: true,
    order: 2,
    type: "social",
    network: "linkedin",
  },
];

const templateIds = new Set<string>(hackathonTemplate.map((question) => question.id));

export function isTemplateQuestion(id: string) {
  return templateIds.has(id);
}

function reorder(questions: CustomQuestion[]) {
  return questions.map((question, order) => ({ ...question, order }));
}

export function withTemplate(questions: CustomQuestionJson | null): CustomQuestionJson {
  const phone = questions?.phone ?? { enabled: false, required: false };
  const custom = questions?.custom ?? [];
  const rest = custom.filter((question) => !templateIds.has(question.id));
  const leading = hackathonTemplate.map(
    (question) => custom.find((existing) => existing.id === question.id) ?? question,
  );
  return { phone, custom: reorder([...leading, ...rest]) };
}

export function withoutTemplate(questions: CustomQuestionJson | null): CustomQuestionJson | null {
  if (!questions) return null;
  return { ...questions, custom: reorder(questions.custom.filter((question) => !templateIds.has(question.id))) };
}

/** Hackathon events carry the template questions, so this works from event data alone. */
export function hasHackathonQuestions(questions: CustomQuestionJson | null | undefined) {
  return Boolean(questions?.custom?.some((question) => question.id === HackathonQuestionId.TeamName));
}

export function teammateQuestions(questions: CustomQuestionJson | null): CustomQuestionJson | null {
  if (!questions) return null;
  return {
    ...questions,
    custom: questions.custom.filter(
      (question) =>
        question.id !== HackathonQuestionId.TeamName && question.id !== HackathonQuestionId.TeamPlan,
    ),
  };
}

export function answerText(answers: Record<string, unknown> | null | undefined, id: string) {
  const value = answers?.[id];
  return typeof value === "string" ? value.trim() : "";
}

export type HackathonApproval = "pending" | "approved" | "rejected";

export type HackathonEventWindow = {
  isHackathon: boolean;
  status: string;
  startTime: string;
  endTime: string | null;
  registrationDeadline: string | null;
};

export type HackathonViewer = {
  teamName: string | null;
  teamPlan: string | null;
  isCaptain: boolean;
  joinPath: string | null;
  /** The team can still take people: not decided, before the deadline. */
  acceptingMembers: boolean;
};

export type HackathonMember = {
  id: string;
  registrationId: string;
  role: "captain" | "member";
  name: string;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  isViewer: boolean;
};

export type HackathonInvite = {
  id: string;
  email: string;
};

export type HackathonTeamDetails = {
  name: string;
  description: string;
  isCaptain: boolean;
  canChangeRoster: boolean;
  /** False once the team is decided, the deadline passed, or the event closed. */
  canAcceptMembers: boolean;
  maxTeamSize: number | null;
  /** Members plus open invites; the one count shown everywhere. */
  seatsTaken: number;
  joinPath: string | null;
  members: HackathonMember[];
  /** Captain only; empty for everyone else. */
  invites: HackathonInvite[];
};

export const MAX_INVITES_PER_REQUEST = 10;

/** Organizer-only view of a member: adds contact and check-in. */
export type HackathonRosterMember = HackathonMember & {
  email: string | null;
  checkedIn: boolean;
};

export type HackathonTeamSummary = {
  id: string;
  name: string;
  description: string;
  approval: HackathonApproval;
  members: HackathonRosterMember[];
};

export type HackathonRoster = {
  canChangeRoster: boolean;
  teams: HackathonTeamSummary[];
  unteamed: Array<{
    registrationId: string;
    name: string;
    avatarUrl: string | null;
    email: string | null;
  }>;
};

export type CaptainTeam = {
  teamId: string;
  eventId: string;
  name: string;
  description: string;
  joinPath: string;
  canChangeRoster: boolean;
  members: HackathonMember[];
};

/** Pure rules for hackathon team writes. Import as a namespace. */
function finishedAt(event: HackathonEventWindow): number {
  const end = event.endTime ? new Date(event.endTime) : new Date(event.startTime);
  return end.getTime();
}

function registrationClosesAt(event: HackathonEventWindow): number {
  const deadline = event.registrationDeadline
    ? new Date(event.registrationDeadline)
    : new Date(event.startTime);
  return deadline.getTime();
}

function isPublishedHackathon(event: HackathonEventWindow): boolean {
  return event.isHackathon && event.status === "published";
}

export function canChangeRoster(event: HackathonEventWindow, now: Date): boolean {
  return isPublishedHackathon(event) && now.getTime() < finishedAt(event);
}

export function canAcceptMembers(
  event: HackathonEventWindow,
  teamApproval: HackathonApproval | null,
  now: Date,
): boolean {
  if (!canChangeRoster(event, now)) return false;
  if (now.getTime() >= registrationClosesAt(event)) return false;
  if (teamApproval === "approved" || teamApproval === "rejected") return false;
  return true;
}

export function closedMessage(event: HackathonEventWindow, now: Date): string {
  if (!event.isHackathon) return "This event is not a hackathon.";
  if (event.status !== "published") return "This hackathon is not open.";
  if (now.getTime() >= finishedAt(event)) return "This hackathon has finished.";
  if (now.getTime() >= registrationClosesAt(event)) {
    return "Registration for this hackathon has closed.";
  }
  return "This hackathon is not open for teams.";
}

export function approvalOf(
  statuses: Array<string | null>,
): HackathonApproval {
  if (statuses.length === 0) return "pending";
  if (statuses.every((status) => status === "approved")) return "approved";
  if (statuses.every((status) => status === "rejected")) return "rejected";
  return "pending";
}
