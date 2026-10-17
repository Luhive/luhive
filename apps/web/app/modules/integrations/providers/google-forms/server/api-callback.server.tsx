import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { createOAuth2Client, getTokensFromCode, GOOGLE_FORMS_SCOPES } from "~/modules/integrations/providers/google-forms/data/google-forms-repo.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
	const { supabase, findAuthUser } = context.get(requestSupabaseContext);
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const error = url.searchParams.get("error");
	const state = url.searchParams.get("state");

	let returnTo = "/dashboard";

	if (error) {
		return redirect("/dashboard?google_forms_error=authorization_failed");
	}
	if (!code) {
		return redirect("/dashboard?google_forms_error=missing_code");
	}

	let userId: string | null = null;
	if (state) {
		try {
			const stateData = JSON.parse(Buffer.from(state, "base64").toString());
			userId = stateData.userId;
			returnTo = stateData.returnTo || "/dashboard";
		} catch (e) {
			console.error("Error parsing state:", e);
		}
	}

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
	if (!userId) userId = user.id;
	if (userId !== user.id) {
		return redirect("/dashboard?google_forms_error=user_mismatch");
	}

	try {
		const oauth2Client = createOAuth2Client();
		const tokens = await getTokensFromCode(oauth2Client, code);
		const { error: upsertError } = await supabase
			.from("google_forms_tokens")
			.upsert(
				{
					user_id: userId,
					access_token: tokens.access_token!,
					refresh_token: tokens.refresh_token || null,
					token_type: tokens.token_type || "Bearer",
					expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
					scope: GOOGLE_FORMS_SCOPES.join(" "),
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" }
			);

		if (upsertError) {
			return redirect(`${returnTo}?google_forms_error=save_failed`);
		}
		return redirect(`${returnTo}?google_forms_connected=true`);
	} catch (err) {
		console.error("Error in OAuth callback:", err);
		return redirect(`${returnTo}?google_forms_error=token_exchange_failed`);
	}
}
