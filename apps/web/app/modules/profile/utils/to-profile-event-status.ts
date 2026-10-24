import type { ProfileEventStatus } from "~/modules/profile/model/profile-event";

type EventApprovalStatus = "pending" | "approved" | "rejected" | null;

export function toProfileEventStatus(input: {
  approvalStatus: EventApprovalStatus;
  isAttended: boolean;
  isUpcoming: boolean;
}): ProfileEventStatus {
  if (input.approvalStatus === "pending") return "pending";
  if (input.approvalStatus === "rejected") return "declined";
  if (input.isAttended) return "attended";
  if (input.isUpcoming) return "going";
  return "registered";
}
