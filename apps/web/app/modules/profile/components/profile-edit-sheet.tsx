import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/shared/components/ui/sheet";
import { Button } from "~/shared/components/ui/button";
import { Spinner } from "~/shared/components/ui/spinner";
import { ProfilePhoto } from "~/modules/profile/components/profile-photo";
import { SocialHandleField } from "~/modules/profile/components/social-handle-field";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";

type ProfileEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  bio: string;
  socialLinks: ProfileLinks.Map;
  onFullNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
};

const fieldClassName =
  "h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[14px] text-[#111] outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

const labelClassName = "text-[13px] font-medium text-[#6e6e73]";

export function ProfileEditSheet({
  open,
  onOpenChange,
  userId,
  fullName,
  avatarUrl,
  onAvatarChange,
  bio,
  socialLinks,
  onFullNameChange,
  onBioChange,
}: ProfileEditSheetProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full bg-white ease-[cubic-bezier(0.23,1,0.32,1)] data-[state=closed]:duration-300 data-[state=open]:duration-300 sm:max-w-[560px]"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-[#111]">Your Profile</SheetTitle>
          <SheetDescription className="sr-only">Update your name, photo, bio, and social links.</SheetDescription>
        </SheetHeader>
        <Form key={String(open)} method="post" className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
          <div className="flex items-start gap-5">
            <div className="min-w-0 flex-1 space-y-2">
              <label htmlFor="full_name" className={labelClassName}>
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                value={fullName}
                onChange={(event) => onFullNameChange(event.target.value)}
                disabled={isSubmitting}
                placeholder="Your name"
                className={fieldClassName}
              />
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className={labelClassName}>Profile picture</span>
              <ProfilePhoto
                userId={userId}
                fullName={fullName}
                avatarUrl={avatarUrl}
                onAvatarChange={onAvatarChange}
                badge="upload"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className={labelClassName}>
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(event) => onBioChange(event.target.value)}
              disabled={isSubmitting}
              placeholder="What do you do? e.g. Product designer, runs a design meetup in Baku"
              rows={2}
              maxLength={240}
              className={`${fieldClassName} h-auto resize-none py-2.5 leading-relaxed`}
            />
          </div>

          <div className="space-y-3">
            <p className={labelClassName}>Social links</p>
            <div className="flex flex-col gap-3">
              <SocialHandleField id="instagram" links={socialLinks} disabled={isSubmitting} />
              <SocialHandleField id="x" links={socialLinks} disabled={isSubmitting} />
              <SocialHandleField id="linkedin" links={socialLinks} disabled={isSubmitting} />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="mt-2 w-fit rounded-full bg-[#111] px-3.5 text-white hover:bg-[#2a2a2a]"
          >
            {isSubmitting ? <Spinner className="size-4" /> : <Check className="size-4" />}
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
