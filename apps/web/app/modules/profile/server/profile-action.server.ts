import { redirect } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request, context }: ActionFunctionArgs) {
  const { supabase, findAuthUser } = context.get(requestSupabaseContext);

  const user = await findAuthUser();

  if (!user) {
    const returnUrl = new URL(request.url).pathname + new URL(request.url).search;
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `pending_return_to=${encodeURIComponent(returnUrl)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );
    return redirect("/login", { headers });
  }

  const formData = await request.formData();
  const fullName = formData.get("full_name") as string;
  const bio = formData.get("bio") as string;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    message: "Profile updated successfully!",
  };
}
