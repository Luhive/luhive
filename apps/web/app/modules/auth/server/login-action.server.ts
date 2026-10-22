import { redirect } from "react-router";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";
import { createClient } from "~/shared/lib/supabase/server";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createClient(request);
  const formData = await request.formData();
  const intent = (formData.get("intent") as string) || "password";
  const cookieHeader = request.headers.get("Cookie") || "";
  const pendingReturnToMatch = cookieHeader.match(/pending_return_to=([^;]+)/);
  const pendingReturnTo = pendingReturnToMatch
    ? decodeURIComponent(pendingReturnToMatch[1])
    : null;
  const returnTo = (formData.get("returnTo") as string | null) || pendingReturnTo;

  if (intent === "oauth") {
    const provider = formData.get("provider") as "google";
    
    if (returnTo) {
      headers.append(
        "Set-Cookie",
        `pending_return_to=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
      );
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: new URL("/auth/verify", publicOrigin(request)).toString(),
      },
    });

    if (error) {
      return Response.json({ success: false, error: error.message }, { headers });
    }

    if (data?.url) {
      return redirect(data.url, { headers });
    }

    return Response.json(
      { success: false, error: "Unable to start OAuth flow." },
      { headers }
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return Response.json({ success: false, error: error.message }, { headers });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (pendingReturnTo) {
      headers.append(
        "Set-Cookie",
        `pending_return_to=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
      );
    }

    if (returnTo) {
      return redirect(returnTo, { headers });
    }

    // Only check for user's created community if no redirect URL
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("slug")
      .eq("created_by", user.id)
      .single();

    if (community && !communityError) {
      return redirect(`/dashboard/${community.slug}`, { headers });
    }
  }

  return redirect("/hub", { headers });
}
