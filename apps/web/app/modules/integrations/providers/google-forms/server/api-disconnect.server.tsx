import type { ActionFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

export async function action({ context }: ActionFunctionArgs) {
	const { supabase, findAuthUser } = context.get(requestSupabaseContext);

	const user = await findAuthUser();
	if (!user) {
		return Response.json(
			{ error: "Not authenticated" },
			{ status: 401 }
		);
	}

	try {
		const { error: deleteError } = await supabase.from("google_forms_tokens").delete().eq("user_id", user.id);

		if (deleteError) {
			console.error("Error deleting tokens:", deleteError);
			return Response.json(
				{ error: "Failed to disconnect", message: deleteError.message },
				{ status: 500 }
			);
		}

		return Response.json(
			{ success: true, message: "Google account disconnected successfully" }
		);
	} catch (error: any) {
		console.error("Error disconnecting Google:", error);
		return Response.json(
			{ error: "Failed to disconnect", message: error.message },
			{ status: 500 }
		);
	}
}
