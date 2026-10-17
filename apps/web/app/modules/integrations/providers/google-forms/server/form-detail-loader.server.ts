import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import {
	createOAuth2Client,
	setCredentials,
	getForm,
	getFormResponses,
	parseFormQuestions,
	parseResponses,
} from "~/modules/integrations/providers/google-forms/data/google-forms-repo.server";
import type { FormDetailLoaderData } from "~/modules/integrations/providers/google-forms/model/google-forms-types";

export type { FormDetailLoaderData };

export async function loader({ params, context }: LoaderFunctionArgs): Promise<FormDetailLoaderData> {
	const { supabase, findAuthUser } = context.get(requestSupabaseContext);
	const { slug, formId } = params;

	const defaultReturn: FormDetailLoaderData = {
		formId: formId || "",
		formTitle: "Form",
		questions: [],
		responses: [],
		totalResponses: 0,
		communitySlug: slug || "",
	};

	if (!formId) {
		return { ...defaultReturn, error: "Form ID is required" };
	}

	const user = await findAuthUser();
	if (!user) {
		return { ...defaultReturn, error: "Not authenticated" };
	}

	try {
		const { data: tokenData, error: tokenError } = await supabase
			.from("google_forms_tokens")
			.select("*")
			.eq("user_id", user.id)
			.single();

		if (tokenError || !tokenData) {
			return { ...defaultReturn, error: "Google account not connected" };
		}

		const oauth2Client = createOAuth2Client();
		setCredentials(oauth2Client, {
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
			expiry_date: tokenData.expiry_date ? new Date(tokenData.expiry_date).getTime() : null,
		});

		const formData = await getForm(oauth2Client, formId);
		const questions = parseFormQuestions(formData);
		const rawResponses = await getFormResponses(oauth2Client, formId);
		const responses = parseResponses(rawResponses, questions);

		return {
			formId,
			formTitle: formData.info?.title || "Untitled Form",
			formDescription: formData.info?.description,
			responderUri: formData.responderUri,
			questions,
			responses,
			totalResponses: responses.length,
			communitySlug: slug || "",
		};
	} catch (error: any) {
		console.error("Error loading form responses:", error);
		if (error.code === 401 || error.message?.includes("invalid_grant")) {
			return { ...defaultReturn, error: "Your Google connection has expired. Please reconnect." };
		}
		return { ...defaultReturn, error: error.message || "Failed to load form" };
	}
}
