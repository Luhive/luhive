import type { Community } from "~/shared/models/entity.types";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import { Card, CardContent, CardHeader } from "~/shared/components/ui/card";
import { Skeleton } from "~/shared/components/ui/skeleton";
import { Badge } from "~/shared/components/ui/badge";
import { BadgeCheck, Heart, Users, Calendar } from "lucide-react";

type CommunityPageSkeletonProps = {
  community: Community & { 
    memberCount?: number; 
    eventCount?: number;
    description?: string;
    verified?: boolean;
  };
};

export function CommunityPageSkeleton({ community }: CommunityPageSkeletonProps) {
  const displayName = community?.name || "";
  const displayTagline = community?.tagline || "";
  const displayDescription = community?.description || "";
  const displayLogo = community?.logo_url || '';
  const displayCover = community?.cover_url || '';
  const displayVerified = community?.verified || false;
  const memberCount = community?.memberCount || 0;
  const eventCount = community?.eventCount || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(120px,auto)]">
      {/* Profile Card - Large */}
      <Card className="md:col-span-2 py-0 lg:col-span-2 lg:row-span-2 border shadow-none overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Cover Picture */}
          {displayCover ? (
            <div className="relative w-full aspect-[4/1] max-h-32 sm:max-h-36 md:max-h-40 lg:max-h-44">
              <img
                src={displayCover}
                alt={`${displayName} cover`}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ) : (
            <Skeleton className="w-full aspect-[4/1] max-h-32 sm:max-h-36 md:max-h-40 lg:max-h-44 bg-muted" />
          )}

          {/* Profile Content */}
          <div className="pb-4 flex flex-col items-center justify-center text-center flex-1 space-y-4 -mt-5">
            {displayName ? (
              <div className="inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5">
                {displayLogo ? (
                  <Avatar className="size-7 rounded-md">
                    <AvatarImage src={displayLogo} alt="" />
                    <AvatarFallback className="rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
                      {displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Skeleton className="size-7 rounded-md bg-muted" />
                )}
                <h1 className="truncate text-[15px] font-bold tracking-tight text-foreground">
                  {displayName}
                </h1>
              </div>
            ) : (
              <Skeleton className="h-10 w-40 rounded-xl bg-muted" />
            )}
            <div className="space-y-2 px-4 w-full max-w-md">
              {displayTagline ? (
                <p className="text-base sm:text-lg text-primary font-medium">{displayTagline}</p>
              ) : (
                <Skeleton className="h-5 w-32 mx-auto bg-muted" />
              )}
              {displayDescription ? (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
                  {displayDescription}
                </p>
              ) : (
                <>
                  <Skeleton className="h-4 w-full bg-muted" />
                  <Skeleton className="h-4 w-3/4 mx-auto bg-muted" />
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge
                variant="outline"
                className="flex items-center gap-1 border-primary/30 text-primary px-3 py-1.5"
              >
                <Heart className="h-3.5 w-3.5" />
                First Adopter
              </Badge>
              {displayVerified && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 border-emerald-400/40 text-emerald-600 dark:text-emerald-400 px-3 py-1.5"
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified by Luhive
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full bg-muted" />
              <Skeleton className="h-8 w-8 rounded-full bg-muted" />
              <Skeleton className="h-8 w-8 rounded-full bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card 1 */}
      <Card className="border shadow-none">
        <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center space-y-2">
          <Users className="h-10 w-10 text-primary" />
          <p className="text-3xl font-bold text-foreground">
            {memberCount >= 1000 ? `${(memberCount / 1000).toFixed(1)}K+` : memberCount}
          </p>
          <p className="text-sm text-muted-foreground">Members</p>
        </CardContent>
      </Card>

      {/* Stats Card 2 */}
      <Card className="border shadow-none">
        <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center space-y-2">
          <Calendar className="h-10 w-10 text-primary" />
          <p className="text-3xl font-bold text-foreground">{eventCount}</p>
          <p className="text-sm text-muted-foreground">Events</p>
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card className="lg:col-span-2 lg:row-span-1 border shadow-none">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-muted" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full bg-muted" />
          <Skeleton className="h-12 w-full bg-muted" />
          <Skeleton className="h-12 w-full bg-muted" />
        </CardContent>
      </Card>

      {/* Upcoming Events Card */}
      <Card className="md:col-span-2 lg:col-span-3 lg:row-span-2 border shadow-none">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full bg-muted" />
            ))}
          </div>
          <Skeleton className="mt-3 h-10 w-full bg-muted" />
        </CardContent>
      </Card>

      {/* Announcements Card */}
      <Card className="md:col-span-2 lg:row-span-2 lg:col-span-1 border shadow-none">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-muted" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px]">
          <Skeleton className="h-16 w-16 rounded-full bg-muted" />
          <Skeleton className="h-5 w-32 mt-4 bg-muted" />
          <Skeleton className="h-4 w-48 mt-2 bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

