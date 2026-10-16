import type { Community } from "~/modules/hub/model/hub-types";
import { cn } from "~/shared/lib/utils/cn";

type CommunityLogoProps = {
  community: Community;
  className: string;
};

const TILE_COLORS = ["#fde8dc", "#e3eefc", "#e6f4ea", "#f3e8fd", "#fdf3d8", "#e8f1f2"];

function pickTileColor(name: string) {
  const code = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return TILE_COLORS[code % TILE_COLORS.length];
}

export function CommunityLogo({ community, className }: CommunityLogoProps) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden", className)}>
      {community.logo_url ? (
        <img src={community.logo_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span
          className="flex size-full items-center justify-center text-[13px] font-semibold text-[#3f4049]"
          style={{ backgroundColor: pickTileColor(community.name) }}
        >
          {community.name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_0.5px_rgba(17,17,17,0.08)]"
      />
    </span>
  );
}
