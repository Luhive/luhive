import type { Route } from "./+types/layout";
import { Outlet, useLoaderData, useMatches, useLocation } from "react-router";
import { useCallback } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { TopNavigation } from "~/shared/components/navigation";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import Footer from "~/shared/components/footer";
import {
	useCurrentUserQuery,
	useSetCurrentUserCache,
} from "~/shared/hooks/use-current-user-query";
import { useQueryClient } from "@tanstack/react-query";
import { clearEventRegistrationSessionState } from "~/modules/events/hooks/use-event-registration-query";
import { dehydrateSeed } from "~/shared/lib/query/dehydrate-loader.server";
import { currentUserKey } from "~/shared/lib/query/query-keys";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase, findAuthUser } = context.get(requestSupabaseContext);
	const authUser = await findAuthUser();

	let profile = null;
	if (authUser) {
		const { data } = await supabase
			.from("profiles")
			.select("id, full_name, avatar_url")
			.eq("id", authUser.id)
			.single();
		profile = data ?? null;
	}

	const dehydratedState = await dehydrateSeed((queryClient) => {
		queryClient.setQueryData(currentUserKey, profile);
	});

	return { dehydratedState };
}

export function shouldRevalidate({
	formMethod,
	defaultShouldRevalidate,
}: {
	formMethod?: string;
	defaultShouldRevalidate: boolean;
}) {
	if (formMethod === "GET" || formMethod === undefined) return false;
	return defaultShouldRevalidate;
}

export default function TopNavigationLayout() {
	const { dehydratedState } = useLoaderData<typeof loader>();

	return (
		<HydrationBoundary state={dehydratedState}>
			<LayoutInner />
		</HydrationBoundary>
	);
}

function LayoutInner() {
	const queryClient = useQueryClient();
	const setCurrentUserCache = useSetCurrentUserCache();
	const { data: user } = useCurrentUserQuery();
	const matches = useMatches();
	const location = useLocation();
	const isHubPage = location.pathname === "/hub";
	const isFocusedRoute = matches.some(
		(m) =>
			typeof m.id === "string" &&
			(m.id.includes("announcement-new") || m.id.includes("event-register")),
	);

	const handleLogout = useCallback(() => {
		setCurrentUserCache(null, false);
		clearEventRegistrationSessionState(queryClient, { revalidate: false });
	}, [queryClient, setCurrentUserCache]);

	return (
		<div
			className={
				isFocusedRoute
					? "min-h-screen bg-background flex flex-col"
					: "min-h-screen container mx-auto px-5 bg-background flex flex-col"
			}
		>
			{!isFocusedRoute && (
				<TopNavigation
					user={user}
					showCreateCommunityOnMobile={isHubPage}
					onLogout={handleLogout}
				/>
			)}
			<main className={isFocusedRoute ? "flex-1" : "flex-1 pb-5 lg:pb-0"}>
				<Outlet />
			</main>
			{!isFocusedRoute && <Footer />}
		</div>
	);
}
