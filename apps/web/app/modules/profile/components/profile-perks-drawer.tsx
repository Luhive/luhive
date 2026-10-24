import { BadgeCheck, Handshake, Sparkles, UsersRound, type LucideIcon } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/shared/components/ui/drawer";
import { profilePrimaryButtonClassName, profileRiseStyle } from "~/modules/profile/components/profile-tokens";
import { ProfileCompleteness } from "~/modules/profile/model/profile-completeness";

type Perk = { icon: LucideIcon; title: string; body: string; soon?: boolean };

const perks: Perk[] = [
  {
    icon: BadgeCheck,
    title: "Profile complete badge",
    body: "The green check next to your name, so people know there's a real person behind it.",
  },
  {
    icon: UsersRound,
    title: "Show up on event pages",
    body: "Your photo and name among the people going, so others see who they'll meet.",
  },
  {
    icon: Handshake,
    title: "Get found after events",
    body: "People you met can open your profile and reach you on LinkedIn, Instagram or X.",
    soon: true,
  },
  {
    icon: Sparkles,
    title: "Smart introductions",
    body: "After an event, we'll connect you with the attendees most related to you, based on your bio and socials.",
    soon: true,
  },
];

type ProfilePerksDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completeness: ReturnType<typeof ProfileCompleteness.check>;
  /** Shown while incomplete: closes the drawer and opens the edit sheet. */
  onFinish?: () => void;
};

/** What a complete profile gets you: a thank-you once earned, the pitch before. */
export function ProfilePerksDrawer({ open, onOpenChange, completeness, onFinish }: ProfilePerksDrawerProps) {
  const { complete } = completeness;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[24px] border-black/[0.06] bg-white font-inter text-[#111]">
        <DrawerHeader className="mx-auto w-full max-w-[720px] items-center px-6 pt-5 text-center md:text-center">
          <span
            className={`mb-2 flex size-11 items-center justify-center rounded-full ${complete ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-black/[0.05] text-[#8c8e9a]"}`}
          >
            <BadgeCheck className="size-6" strokeWidth={2.25} aria-hidden />
          </span>
          <DrawerTitle className="text-[20px] font-semibold tracking-tight text-[#111]">
            {complete ? "Your profile is complete" : "What a complete profile unlocks"}
          </DrawerTitle>
          <DrawerDescription className="text-[14px] text-[#6e6e73]">
            {complete
              ? "Here's what that gets you on Luhive."
              : `${completeness.done} of ${completeness.total} done. Finish the rest to get these.`}
          </DrawerDescription>
        </DrawerHeader>
        <ul className="mx-auto grid w-full max-w-[720px] grid-cols-1 gap-1 overflow-y-auto px-4 pb-2 sm:grid-cols-2 sm:gap-2">
          {perks.map((perk, index) => {
            const rise = profileRiseStyle(index + 1);
            const Icon = perk.icon;
            return (
              <li key={perk.title} className={`${rise.className} flex gap-3 rounded-2xl px-3 py-3`} style={rise.style}>
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[#111]">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-medium text-[#111]">
                    {perk.title}
                    {perk.soon ? (
                      <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-[#6e6e73]">
                        Coming soon
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#6e6e73]">{perk.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mx-auto flex w-full max-w-[720px] justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
          {complete || !onFinish ? (
            <DrawerClose asChild>
              <button type="button" className={`${profilePrimaryButtonClassName} h-11 w-full sm:w-[240px]`}>
                Got it
              </button>
            </DrawerClose>
          ) : (
            <button type="button" onClick={onFinish} className={`${profilePrimaryButtonClassName} h-11 w-full sm:w-[240px]`}>
              Finish my profile
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
