import type { ProfileEventStatus } from "~/modules/profile/model/profile-event";
import { cn } from "~/shared/lib/utils/cn";

const STATUS_LABEL: Record<ProfileEventStatus, string> = {
  hosted: "Hosted",
  going: "Going",
  pending: "Pending",
  declined: "Declined",
  attended: "Attended",
  registered: "Registered",
};

const STATUS_CLASS: Record<ProfileEventStatus, string> = {
  hosted: "bg-[#fff1e8] text-[#c2410c]",
  going: "bg-[#e8f7ee] text-[#1a7f45]",
  pending: "bg-[#fdf3d8] text-[#8a5a00]",
  declined: "bg-[#fde8ec] text-[#c0264b]",
  attended: "bg-[#e6effc] text-[#1f5fbf]",
  registered: "bg-black/[0.05] text-[#6e6e73]",
};

export function ProfileStatusPill({ status }: { status: ProfileEventStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium",
        STATUS_CLASS[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
