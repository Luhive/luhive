import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

export async function loader({ context }: LoaderFunctionArgs) {
	const { supabase, findAuthUser } = context.get(requestSupabaseContext);

	const user = await findAuthUser();
	if (!user) {
		return Response.json(
			{ connected: false, error: "Not authenticated" },
			{ status: 401 }
		);
	}

	try {
		const { data: tokenData, error: tokenError } = await supabase
			.from("google_forms_tokens")
			.select("id, expiry_date, updated_at")
			.eq("user_id", user.id)
			.single();

		if (tokenError || !tokenData) {
			return Response.json(
				{ connected: false, message: "Google account not connected" }
			);
		}

		const isExpired = tokenData.expiry_date && new Date(tokenData.expiry_date) < new Date();
		return Response.json(
			{ connected: true, isExpired, lastUpdated: tokenData.updated_at }
		);
	} catch (error) {
		console.error("Error checking Google Forms status:", error);
		return Response.json(
			{ connected: false, error: "Failed to check status" },
			{ status: 500 }
		);
	}
}
