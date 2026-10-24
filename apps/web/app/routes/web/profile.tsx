export { loader } from "~/modules/profile/server/profile-loader.server";
export { action } from "~/modules/profile/server/profile-action.server";
export { meta } from "~/modules/profile/model/profile-meta";

import { Suspense, useEffect, useState } from "react";
import { Await, useActionData, useLoaderData, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ProfileCommunityList } from "~/modules/profile/components/profile-community-list";
import { ProfileEditSheet } from "~/modules/profile/components/profile-edit-sheet";
import { ProfileEventsTable } from "~/modules/profile/components/profile-events-table";
import { ProfileHeader } from "~/modules/profile/components/profile-header";
import { ProfileActivityCard } from "~/modules/profile/components/profile-activity-card";
import {
  ProfileActivitySkeleton,
  ProfileActivityUnavailable,
  ProfileCommunitiesSkeleton,
  ProfileEventsSkeleton,
} from "~/modules/profile/components/profile-skeletons";
// import { ProfileStatSkeleton } from "~/modules/profile/components/profile-skeletons";
import { ProfileSidebar } from "~/modules/profile/components/profile-sidebar";
import { ProfileSignedOut } from "~/modules/profile/components/profile-signed-out";
// import { ProfileStatCards } from "~/modules/profile/components/profile-stat-cards";
import { parseProfileTab, ProfileTabs, type EventWindow, type ProfileTab } from "~/modules/profile/components/profile-tabs";
import { profileCardClassName, profileRiseStyle } from "~/modules/profile/components/profile-tokens";
import { ProfileLinks } from "~/modules/profile/model/profile-social-links";
import type { loader } from "~/modules/profile/server/profile-loader.server";

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}) {
  if (formMethod && formMethod !== "GET") return defaultShouldRevalidate;
  if (currentUrl.pathname !== nextUrl.pathname) return defaultShouldRevalidate;

  const current = new URLSearchParams(currentUrl.search);
  const next = new URLSearchParams(nextUrl.search);
  current.delete("tab");
  next.delete("tab");
  if (current.toString() === next.toString()) return false;
  return defaultShouldRevalidate;
}

export default function ProfilePage() {
  const { user, communities, stats, events, activityWindow, activity } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const actionData = useActionData<{ success?: boolean; error?: string; message?: string }>();
  const tab = parseProfileTab(searchParams.get("tab"));
  const [eventWindow, setEventWindow] = useState<EventWindow>("upcoming");
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || "");
    setBio(user.bio || "");
    setAvatarUrl(user.avatar_url ?? null);
  }, [user]);

  useEffect(() => {
    if (actionData?.success) {
      setIsEditing(false);
      toast.success(actionData.message);
    } else if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  function selectTab(next: ProfileTab) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === "communities") params.delete("tab");
        else params.set("tab", next);
        return params;
      },
      { replace: true },
    );
  }

  if (!user) return <ProfileSignedOut />;

  const socialLinks = ProfileLinks.read(user.metadata);
  // On a wrapper outside the boundary, so the skeleton-to-data swap doesn't replay the entrance.
  const activityRise = profileRiseStyle(0);

  return (
    <div className="font-inter py-8 text-[#111] md:py-10">
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,5fr)_minmax(0,1fr)] md:gap-6">
          <div className="order-2 md:order-none md:col-start-1 md:row-start-1">
          <ProfileSidebar
            createdAt={user.created_at}
            links={socialLinks}
            onEdit={() => setIsEditing(true)}
          />
          </div>
          <div className="order-1 flex min-w-0 flex-col gap-8 md:col-start-2 md:row-start-1">
        <ProfileHeader
          user={user}
          avatarUrl={avatarUrl}
          onAvatarChange={setAvatarUrl}
          onEdit={() => setIsEditing(true)}
        />
        {/* Stat cards hidden for now, kept for later.
        <Suspense fallback={<ProfileStatSkeleton />}>
          <Await resolve={stats}>
            {(resolvedStats) => (
              <Await resolve={communities}>
                {(resolvedCommunities) => (
                  <ProfileStatCards stats={resolvedStats} communities={resolvedCommunities} />
                )}
              </Await>
            )}
          </Await>
        </Suspense>
        */}
        <div className={activityRise.className} style={activityRise.style}>
          <Suspense fallback={<ProfileActivitySkeleton range={activityWindow} />}>
            <Await resolve={activity} errorElement={<ProfileActivityUnavailable range={activityWindow} />}>
              {(resolvedActivity) => <ProfileActivityCard activity={resolvedActivity} range={activityWindow} />}
            </Await>
          </Suspense>
        </div>
        <div>
          <div className="mb-3">
            <ProfileTabs
              value={tab}
              onChange={selectTab}
              eventWindow={eventWindow}
              onEventWindowChange={setEventWindow}
            />
          </div>
        {tab === "communities" ? (
          <div key={tab} className={`${profileCardClassName} overflow-hidden`}>
            <Suspense fallback={<ProfileCommunitiesSkeleton />}>
              <Await resolve={communities}>
                {(resolvedCommunities) => (
                  <Await resolve={stats}>
                    {(resolvedStats) => (
                      <ProfileCommunityList
                        communities={resolvedCommunities}
                        memberCounts={resolvedStats.membersByCommunity}
                      />
                    )}
                  </Await>
                )}
              </Await>
            </Suspense>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className={`${profileCardClassName} overflow-hidden`}>
                <ProfileEventsSkeleton />
              </div>
            }
          >
            <Await resolve={events}>
              {(resolvedEvents) => <ProfileEventsTable events={resolvedEvents} period={eventWindow} />}
            </Await>
          </Suspense>
        )}
        </div>
          </div>
          <div className="hidden md:col-start-3 md:row-start-1 md:block" aria-hidden />
      </div>
      <ProfileEditSheet
        open={isEditing}
        onOpenChange={setIsEditing}
        userId={user.id}
        fullName={fullName}
        avatarUrl={avatarUrl}
        onAvatarChange={setAvatarUrl}
        bio={bio}
        socialLinks={socialLinks}
        onFullNameChange={setFullName}
        onBioChange={setBio}
      />
    </div>
  );
}
