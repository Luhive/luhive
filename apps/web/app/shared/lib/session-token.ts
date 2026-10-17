import { Result } from "@luhive/domain";
import type { RouterContextProvider } from "react-router";
import type { RequestInterceptor } from "@luhive/api-client";
import { requestSupabaseContext } from "./supabase/request-supabase-context.server";

/** Forwards the signed-in user's Supabase access token to core, or stops the call when nobody is signed in. */
export const addSessionToken: RequestInterceptor<Readonly<RouterContextProvider>> = async (
  headers,
  context,
) => {
  const { supabase } = context.get(requestSupabaseContext);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return Result.failure("unauthorized");

  headers.set("Authorization", `Bearer ${token}`);
  return undefined;
};
