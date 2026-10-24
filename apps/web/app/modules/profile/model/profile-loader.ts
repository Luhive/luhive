import type { Profile } from "~/shared/models/entity.types";
import type { ActivityWindow, ProfileActivity } from "~/modules/profile/model/profile-activity";
import type { ProfileCommunity } from "~/modules/profile/model/profile-community";
import type { ProfileEvent } from "~/modules/profile/model/profile-event";
import type { ProfileStats } from "~/modules/profile/model/profile-stats";

export type ProfileLoaderData = {
  user: Profile | null;
  email: string | null;
  communities: Promise<ProfileCommunity[]>;
  stats: Promise<ProfileStats>;
  events: Promise<ProfileEvent[]>;
  activityWindow: ActivityWindow;
  activity: Promise<ProfileActivity>;
};
