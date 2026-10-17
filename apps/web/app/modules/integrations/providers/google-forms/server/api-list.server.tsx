import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { createOAuth2Client, setCredentials, listForms } from "~/modules/integrations/providers/google-forms/data/google-forms-repo.server";

export async function loader({ context }: LoaderFunctionArgs) {
	const { supabase, findAuthUser } = context.get(requestSupabaseContext);

	const user = await findAuthUser();
	if (!user) {
		return Response.json(
			{ error: "Not authenticated", message: "Please log in first" },
			{ status: 401 }
		);
	}

	try {
		const { data: tokenData, error: tokenError } = await supabase
			.from("google_forms_tokens")
			.select("*")
			.eq("user_id", user.id)
			.single();

		if (tokenError || !tokenData) {
			return Response.json(
				{ connected: false, forms: [], message: "Please connect your Google account to view forms" }
			);
		}

		const oauth2Client = createOAuth2Client();
		setCredentials(oauth2Client, {
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
			expiry_date: tokenData.expiry_date ? new Date(tokenData.expiry_date).getTime() : null,
		});

		const forms = await listForms(oauth2Client);
		return Response.json(
			{
				connected: true,
				count: forms.length,
				forms: forms.map((form) => ({
					id: form.id,
					name: form.name,
					createdTime: form.createdTime,
					modifiedTime: form.modifiedTime,
					webViewLink: form.webViewLink,
				})),
			}
		);
	} catch (error: any) {
		console.error("Error listing forms:", error);
		if (error.code === 401 || error.message?.includes("invalid_grant")) {
			return Response.json(
				{ connected: false, error: "token_expired", message: "Your Google connection has expired. Please reconnect." },
				{ status: 401 }
			);
		}
		return Response.json(
			{ error: "Failed to list forms", message: error.message },
			{ status: 500 }
		);
	}
}
