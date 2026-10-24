import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { ProfilePerksDrawer } from "~/modules/profile/components/profile-perks-drawer";
import { ProfileCompleteness } from "~/modules/profile/model/profile-completeness";

const ease = "ease-[cubic-bezier(0.23,1,0.32,1)]";

type ProfileCompleteBadgeProps = {
  completeness: ReturnType<typeof ProfileCompleteness.check>;
  celebrate?: boolean;
};

/** Green check beside the name; hover slides the label out, a click opens what it unlocks. */
export function ProfileCompleteBadge({ completeness, celebrate = false }: ProfileCompleteBadgeProps) {
  const [open, setOpen] = useState(false);

  // Waits for the edit sheet to finish sliding out before the drawer rises.
  useEffect(() => {
    if (!celebrate) return;
    const timer = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, [celebrate]);

  return (
    <>
      <button
        type="button"
        aria-label="Profile complete, see what it unlocks"
        data-open={open || undefined}
        onClick={() => setOpen(true)}
        className={`group inline-flex h-7 shrink-0 items-center rounded-full px-1 text-[#16A34A] outline-none transition-[background-color,transform] duration-200 ${ease} hover:bg-[#16A34A]/10 focus-visible:ring-2 focus-visible:ring-[#16A34A]/30 active:scale-[0.97] data-[open]:bg-[#16A34A]/10 motion-reduce:transition-none`}
      >
        <BadgeCheck className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
        <span
          className={`grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ${ease} group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] group-data-[open]:grid-cols-[1fr] motion-reduce:transition-none`}
        >
          <span className="overflow-hidden">
            <span
              className={`block -translate-x-1 whitespace-nowrap pl-1 pr-1.5 text-[13px] font-medium opacity-0 blur-[2px] transition-[opacity,filter,transform] duration-200 ${ease} group-hover:translate-x-0 group-hover:opacity-100 group-hover:blur-[0px] group-focus-visible:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:blur-[0px] group-data-[open]:translate-x-0 group-data-[open]:opacity-100 group-data-[open]:blur-[0px] motion-reduce:transition-none`}
            >
              Profile complete
            </span>
          </span>
        </span>
      </button>
      <ProfilePerksDrawer open={open} onOpenChange={setOpen} completeness={completeness} />
    </>
  );
}
