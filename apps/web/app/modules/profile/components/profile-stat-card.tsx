import type { ReactNode } from "react";
import { useCountUp } from "~/modules/profile/hooks/use-count-up";
import { profileCardClassName, profileRiseStyle } from "~/modules/profile/components/profile-tokens";
import { cn } from "~/shared/lib/utils/cn";

type BarSegment = {
  id: string;
  value: number;
};

type ProfileStatCardProps = {
  label: string;
  value: number;
  storageKey: string;
  riseIndex: number;
  suffix?: string;
  footer: string;
  pill?: string | null;
  segments?: BarSegment[];
};

export function ProfileStatCard({
  label,
  value,
  storageKey,
  riseIndex,
  suffix,
  footer,
  pill,
  segments,
}: ProfileStatCardProps) {
  const shown = useCountUp(value, storageKey);
  const rise = profileRiseStyle(riseIndex);
  const total = (segments ?? []).reduce((sum, segment) => sum + segment.value, 0);

  return (
    <article className={cn(profileCardClassName, "flex min-h-[148px] flex-col", rise.className)} style={rise.style}>
      <div className="px-4 pt-4">
        <p className="text-[13px] font-medium text-[#6e6e73]">{label}</p>
        <p className="mt-2 text-[28px] font-semibold tabular-nums leading-none tracking-tight text-[#111]">
          {shown.toLocaleString()}
          {suffix ? <span className="ml-1.5 text-[15px] font-medium text-[#8c8e9a]">{suffix}</span> : null}
        </p>
        {segments ? <ProfileCompositionBar segments={segments} total={total} /> : <div className="mt-4 h-2" />}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 rounded-b-[16px] border-t border-black/[0.06] bg-[#fafafa] px-4 py-2.5 text-[12px] text-[#6e6e73]">
        <span className="truncate">{footer}</span>
        {pill ? (
          <span className="shrink-0 rounded-full bg-[#f3e8fd] px-2 py-0.5 font-medium text-[#6b3fa0]">{pill}</span>
        ) : null}
      </div>
    </article>
  );
}

function ProfileCompositionBar({ segments, total }: { segments: BarSegment[]; total: number }) {
  if (total <= 0) {
    return (
      <div className="mt-4 h-2 rounded-full bg-[repeating-linear-gradient(90deg,#d4d4d8_0_1px,transparent_1px_7px)]" />
    );
  }

  const visible = segments.filter((segment) => segment.value > 0);
  let consumed = 0;

  return (
    <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-[repeating-linear-gradient(90deg,#e4e4e7_0_1px,transparent_1px_7px)]">
      {visible.map((segment, index) => {
        const share = segment.value / total;
        const position = consumed;
        consumed += share;
        return (
          <div key={segment.id} className="h-full overflow-hidden" style={{ width: `${share * 100}%` }}>
            <div
              className="profile-bar-segment h-full"
              style={{
                width: `${100 / share}%`,
                marginLeft: `${-(position / share) * 100}%`,
                backgroundImage: "linear-gradient(90deg,#ff5f6d,#c86dd7,#5b8def)",
                ["--bar-delay" as string]: `${index * 80}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
