import { NavLink } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/components/ui/card";
import { Badge } from "~/shared/components/ui/badge";
import { Users, Calendar, BadgeCheck, Heart } from "lucide-react";
import type { Community } from "~/modules/hub/model/hub-types";
import { Routes } from "~/shared/lib/routing/routes";

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const memberCount = community.memberCount || 0;
  const eventCount = community.eventCount || 0;

  return (
    <NavLink
      to={community.isAdmin ? Routes.dashboard.overview(community.slug) : Routes.community.detail(community.slug)}
      prefetch="intent"
      viewTransition
      className="group"
    >
      <Card className="h-full gap-5 cursor-pointer border hover:border-primary/30 transition-all duration-200 shadow-none hover:shadow-md group transform-gpu hover:scale-[1.02] hover:-rotate-1">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2">
              <AvatarImage src={community.logo_url || ""} alt={community.name} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {community.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <CardTitle className="text-xl font-bold text-foreground mb-1 min-w-0 line-clamp-2 break-words leading-snug">
                {community.name}
              </CardTitle>
              {community.tagline && (
                <p className="text-sm text-primary font-medium truncate whitespace-normal">
                  {community.tagline}
                </p>
              )}
            </div>
          </div>
          {community.verified && (
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1 py-1 border-emerald-400/40 text-emerald-600 dark:text-emerald-400 px-2 text-xs"
              >
                <BadgeCheck className="h-3 w-3" />
                Verified
              </Badge>
              <Badge
                variant="outline"
                className="flex items-center gap-1 border-primary/30 text-primary px-2 py-1 text-xs"
              >
                <Heart className="h-3 w-3" />
                First Adopter
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {community.description && (
            <p className="text-sm leading-snug text-muted-foreground line-clamp-2">
              {community.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>
                {memberCount >= 1000
                  ? `${(memberCount / 1000).toFixed(1)}K`
                  : memberCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{eventCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </NavLink>
  );
}
