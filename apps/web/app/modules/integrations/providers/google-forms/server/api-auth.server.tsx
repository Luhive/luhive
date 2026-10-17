import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { createOAuth2Client, getAuthUrl } from "~/modules/integrations/providers/google-forms/data/google-forms-repo.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
	const { findAuthUser } = context.get(requestSupabaseContext);

	const user = await findAuthUser();
	if (!user) {
		return Response.json(
			{ error: "Not authenticated", message: "Please log in first" },
			{ status: 401 }
		);
	}

	try {
		const url = new URL(request.url);
		const returnTo = url.searchParams.get("returnTo") || "/dashboard";
		const oauth2Client = createOAuth2Client();
		const state = Buffer.from(JSON.stringify({ userId: user.id, returnTo })).toString("base64");
		const authUrl = getAuthUrl(oauth2Client, state);
		return redirect(authUrl);
	} catch (error) {
		console.error("Error initiating Google OAuth:", error);
		return Response.json(
			{ error: "OAuth initialization failed", message: (error as Error).message },
			{ status: 500 }
		);
	}
}
