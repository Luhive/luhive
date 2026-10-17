import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export type CreateCommunityLoaderData = {
  user: { id: string };
};

export async function loader({
  context,
}: LoaderFunctionArgs): Promise<CreateCommunityLoaderData | Response> {
  const { findAuthUser } = context.get(requestSupabaseContext);

  const user = await findAuthUser();

  if (!user) {
    return redirect("/signup?redirect=/create-community");
  }

  return {
    user: { id: user.id },
  };
}
