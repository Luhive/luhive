import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ProfilePerksDrawer } from "~/modules/profile/components/profile-perks-drawer";
import { profileCardClassName } from "~/modules/profile/components/profile-tokens";
import { ProfileCompleteness } from "~/modules/profile/model/profile-completeness";

type ProfileCompletionCardProps = {
  completeness: ReturnType<typeof ProfileCompleteness.check>;
  onEdit: () => void;
};

const linkClassName =
  "inline-flex items-center gap-1 text-[13px] outline-none transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:underline active:scale-[0.97]";

export function ProfileCompletionCard({ completeness, onEdit }: ProfileCompletionCardProps) {
  const [perksOpen, setPerksOpen] = useState(false);

  if (completeness.complete) return null;

  // Lets the drawer slide away before the edit sheet comes in from the side.
  function finish() {
    setPerksOpen(false);
    window.setTimeout(onEdit, 300);
  }

  return (
    <div className={`${profileCardClassName} flex w-full flex-col gap-3 px-5 py-4`}>
      <div>
        <p className="text-[14px] font-medium text-[#111]">Your profile is {completeness.percent}% complete</p>
        <p className="mt-0.5 text-[13px] text-[#6e6e73]">{completeness.nextReason}</p>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#ececee]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={completeness.total}
        aria-valuenow={completeness.done}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ width: `${completeness.percent}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <button type="button" onClick={onEdit} className={`${linkClassName} font-medium text-[#111] hover:text-[#6e6e73]`}>
          Next: {completeness.nextLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
        <button type="button" onClick={() => setPerksOpen(true)} className={`${linkClassName} text-[#8c8e9a] hover:text-[#111]`}>
          Why complete it?
        </button>
      </div>
      <ProfilePerksDrawer
        open={perksOpen}
        onOpenChange={setPerksOpen}
        completeness={completeness}
        onFinish={finish}
      />
    </div>
  );
}
