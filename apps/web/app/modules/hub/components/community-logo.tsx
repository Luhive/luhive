import { cn } from "~/shared/lib/utils/cn";

type CommunityLogoProps = {
  name: string;
  logoUrl: string | null;
  className: string;
};

const FALLBACK_TILE_COLORS = ["#fde8dc", "#e3eefc", "#e6f4ea", "#f3e8fd", "#fdf3d8", "#e8f1f2"];

function pickFallbackTileColor(name: string) {
  const code = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return FALLBACK_TILE_COLORS[code % FALLBACK_TILE_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CommunityLogo({ name, logoUrl, className }: CommunityLogoProps) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden", className)}>
      {logoUrl ? (
        <img src={logoUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span
          className="flex size-full items-center justify-center text-[13px] font-semibold text-[#3f4049]"
          style={{ backgroundColor: pickFallbackTileColor(name) }}
        >
          {getInitials(name)}
        </span>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_0.5px_rgba(17,17,17,0.08)]"
      />
    </span>
  );
}
