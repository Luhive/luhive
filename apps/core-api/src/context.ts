export type AppEnv = {
  Variables: {
    requestId: string;
    userId: string;
  };
};

/**
 * Routes scoped to one community. `communityId` is set by the credential
 * middleware, never read from the request.
 */
export type CommunityEnv = {
  Variables: AppEnv["Variables"] & {
    communityId: string;
  };
};
