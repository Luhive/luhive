import { Plus } from "lucide-react";
import { ProfileSocialLogo } from "~/modules/profile/components/profile-social-logo";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";

type ProfileSidebarProps = {
  createdAt: string | null;
  links: ProfileLinks.Map;
  onEdit: () => void;
};

function joinedLabel(createdAt: string | null) {
  if (!createdAt) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  if (days <= 0) return "Joined today";
  if (days === 1) return "Joined 1 day ago";
  return `Joined ${days} days ago`;
}

function socialHandle(id: ProfileLinks.Id, href: string) {
  try {
    const url = new URL(href);
    const parts = url.pathname.split("/").filter(Boolean);
    const handle = decodeURIComponent(parts[parts.length - 1] ?? url.hostname);
    if (id === "x") return handle.startsWith("@") ? handle : `@${handle}`;
    return handle;
  } catch {
    return href;
  }
}

export function ProfileSidebar({ createdAt, links, onEdit }: ProfileSidebarProps) {
  const joined = joinedLabel(createdAt);
  const connected = ProfileLinks.ids.filter((id) => links[id]);

  return (
    <aside className="flex min-w-0 flex-col items-start gap-3">
      {joined ? <p className="text-[13px] text-[#6e6e73]">{joined}</p> : null}
      {connected.length > 0 ? (
        <ul className="flex w-full flex-col gap-2.5">
          {connected.map((id) => (
            <li key={id}>
              <a
                href={links[id] ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-[13px] text-[#6e6e73] outline-none transition-colors duration-150 hover:text-[#111] focus-visible:text-[#111]"
              >
                <ProfileSocialLogo id={id} className="size-3.5" />
                <span className="truncate">{socialHandle(id, links[id] ?? "")}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 text-[13px] text-[#6e6e73] underline-offset-4 outline-none hover:text-[#111] hover:underline focus-visible:underline"
      >
        <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
        Add links
      </button>
      {/* Role badge hidden for now.
      <Suspense fallback={null}>
        <Await resolve={communities}>{(list) => <RolePill communities={list} />}</Await>
      </Suspense>
      */}
    </aside>
  );
}

/* function RolePill({ communities }: { communities: ProfileCommunity[] }) {
  const managed = communities.find((community) => community.canManage);
  const label = managed
    ? `${managed.role ? managed.role.charAt(0).toUpperCase() + managed.role.slice(1) : "Owner"}`
    : "Member";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] text-[#6e6e73]">
      <span className="size-1.5 rounded-full bg-[#8c8e9a]" aria-hidden />
      {label}
    </span>
  );
} */

