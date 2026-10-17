import type { LoaderFunctionArgs } from "react-router";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

export async function loader({ context }: LoaderFunctionArgs) {
	const { supabase, findAuthUser } = context.get(requestSupabaseContext);
	const authUser = await findAuthUser();

	if (!authUser) {
		return Response.json({ user: null });
	}

	const { data: profile } = await supabase
		.from("profiles")
		.select("*")
		.eq("id", authUser.id)
		.single();

	return Response.json({ user: profile || null });
}
