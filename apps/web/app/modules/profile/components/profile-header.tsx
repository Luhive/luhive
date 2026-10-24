import { ArrowLeft, SquarePen } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { ProfileCompleteBadge } from "~/modules/profile/components/profile-complete-badge";
import { ProfilePhoto } from "~/modules/profile/components/profile-photo";
import type { ProfileCompleteness } from "~/modules/profile/model/profile-completeness";
import { linkifyText } from "~/modules/profile/utils/linkify-text";
import { Routes } from "~/shared/lib/routing/routes";
import type { Profile } from "~/shared/models/entity.types";

type ProfileHeaderProps = {
  user: Profile;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  onEdit: () => void;
  /** Whether the four fields are filled right now; the stored badge only records that it was earned once. */
  completeness: ReturnType<typeof ProfileCompleteness.check>;
  /** True right after the save that completed the profile, to open the perks drawer once. */
  celebrate?: boolean;
};

function ProfileBio({ bio }: { bio: string }) {
  return (
    <p className="mt-1.5 text-[14px] leading-relaxed text-[#6e6e73]">
      {linkifyText(bio).map((part, index) =>
        typeof part === "string" ? (
          <span key={index}>{part}</span>
        ) : (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF6D23] underline-offset-2 hover:underline"
          >
            {part.label}
          </a>
        ),
      )}
    </p>
  );
}

export function ProfileHeader({
  user,
  avatarUrl,
  onAvatarChange,
  onEdit,
  completeness,
  celebrate = false,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = user.full_name?.trim() || "Your profile";

  function goBack() {
    if (location.key === "default") navigate(Routes.hub);
    else navigate(-1);
  }

  return (
    <header>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6e6e73] outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97] [@media(hover:hover)]:hover:text-[#111]"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit profile"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#111] outline-none transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/15 active:scale-[0.97] [@media(hover:hover)]:hover:text-[#6e6e73]"
        >
          <SquarePen className="size-3.5" aria-hidden />
          <span className="sm:hidden">Edit</span>
          <span className="hidden sm:inline">Edit profile</span>
        </button>
      </div>
      <div className="flex items-center gap-4">
        <ProfilePhoto
          userId={user.id}
          fullName={user.full_name}
          avatarUrl={avatarUrl}
          onAvatarChange={onAvatarChange}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight text-[#111]">
              {displayName}
            </h1>
            {completeness.complete ? <ProfileCompleteBadge completeness={completeness} celebrate={celebrate} /> : null}
          </div>
          {user.bio?.trim() ? <ProfileBio bio={user.bio.trim()} /> : null}
        </div>
      </div>
    </header>
  );
}
