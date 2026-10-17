import type { Community, UserData } from "~/modules/hub/model/hub-types";

export type HubLegacyData = {
  communities: Community[];
  user: UserData;
};

/** Loader return shape for /hub-legacy (deferred). */
export type HubLegacyLoaderData = {
  data: Promise<HubLegacyData>;
};
