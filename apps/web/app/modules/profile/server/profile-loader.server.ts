import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { LoaderFunctionArgs } from "react-router";
import { Profile } from "~/shared/models/entity.types";


export type ProfileLoaderData = {
  user: Profile | null;
  email: string | null;
};

export async function loader({
  context,
}: LoaderFunctionArgs): Promise<ProfileLoaderData> {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const authUser = await findAuthUser();

  if (!authUser) {
    return { user: null, email: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return {
    user: profile || null,
    email: authUser.email || null,
  };
}
