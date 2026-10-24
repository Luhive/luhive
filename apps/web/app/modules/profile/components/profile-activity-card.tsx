import { useId, useMemo } from "react";
import { ActivityCardShell, ProfileActivityGrid } from "~/modules/profile/components/profile-activity-grid";
import { activityTotals, type ActivityWindow, type ProfileActivity } from "~/modules/profile/model/profile-activity";

const TOTALS_LINE_CLASS =
  "@container mt-3 flex min-h-[18px] min-w-0 items-baseline justify-between gap-x-2 overflow-hidden whitespace-nowrap text-[clamp(9px,2.7cqi,12px)] leading-[18px] text-[#8c8e9a] tabular-nums sm:justify-start sm:gap-x-6 sm:text-[12px]";

export function ProfileActivityCard({ activity, range }: { activity: ProfileActivity; range: ActivityWindow }) {
  const summaryId = useId();
  const totals = useMemo(() => activityTotals(activity), [activity]);
  const isEmpty = activity.days.length === 0;

  return (
    <ActivityCardShell>
      <ProfileActivityGrid activity={activity} range={range} describedBy={summaryId} />
      <p id={summaryId} className="sr-only">
        {isEmpty
          ? "No activity in the last year."
          : `In the last year: ${totals.hosted} events hosted, ${totals.attended} attended, ${totals.updatesSent} updates sent, ${totals.updatesOpened} opened.`}
      </p>
      {isEmpty ? (
        <p aria-hidden data-follow className={`activity-reveal ${TOTALS_LINE_CLASS}`}>
          Your activity shows up here once you join an event.
        </p>
      ) : (
        <div aria-hidden data-follow className={`activity-reveal ${TOTALS_LINE_CLASS}`}>
          <span className="min-w-0 shrink truncate">
            Events <strong className="font-semibold text-[#111]">{totals.hosted}</strong> hosted /{" "}
            <strong className="font-semibold text-[#111]">{totals.attended}</strong> attended
          </span>
          <span className="min-w-0 shrink truncate">
            Updates <strong className="font-semibold text-[#111]">{totals.updatesSent}</strong> sent /{" "}
            <strong className="font-semibold text-[#111]">{totals.updatesOpened}</strong> opened
          </span>
        </div>
      )}
    </ActivityCardShell>
  );
}
