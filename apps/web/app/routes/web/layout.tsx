import type { Route } from "./+types/layout";
import { Outlet, useLoaderData, useLocation, useMatches } from "react-router";
import { HydrationBoundary } from "@tanstack/react-query";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";
import { dehydrateSeed } from "~/shared/lib/query/dehydrate-loader.server";
import { currentUserKey } from "~/shared/lib/query/query-keys";
import {
	getAdminCommunityIds,
	listManagedCommunities,
} from "~/modules/hub/data/hub-repo.server";
import { HubNavigation } from "~/modules/hub/components/hub-navigation";
import { HubFooter } from "~/modules/hub/components/hub-footer";
import { CurrentUserAccountActions } from "~/modules/hub/components/current-user-account-actions";
import { HubLegacyNavigation } from "~/modules/hub/components/legacy/hub-legacy-navigation";
import Footer from "~/shared/components/footer";
import { safeAreaGutterClassName } from "~/modules/hub/components/hub-grid-layout";
import { Routes } from "~/shared/lib/routing/routes";

export { links } from "~/modules/hub/model/hub-meta";

const layoutWidthClassName = "container px-5";
const hubWidthClassName = `max-w-[1040px] ${safeAreaGutterClassName}`;

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

	const managedCommunities = authUser
		? getAdminCommunityIds(supabase, authUser.id).then((ids) =>
				listManagedCommunities(supabase, ids),
			)
		: Promise.resolve([]);

	const dehydratedState = await dehydrateSeed((queryClient) => {
		queryClient.setQueryData(currentUserKey, profile);
	});

	return {
		dehydratedState,
		viewerEmail: authUser?.email ?? null,
		managedCommunities,
	};
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
	const { dehydratedState, viewerEmail, managedCommunities } =
		useLoaderData<typeof loader>();
	const matches = useMatches();
	const location = useLocation();
	const isFocusedRoute = matches.some(
		(m) =>
			typeof m.id === "string" &&
			(m.id.includes("announcement-new") || m.id.includes("event-register")),
	);
	const pageWidthClassName =
		location.pathname === Routes.profile ? hubWidthClassName : layoutWidthClassName;

	if (location.pathname === Routes.hubLegacy) {
		return (
			<HydrationBoundary state={dehydratedState}>
				<div className="min-h-screen container mx-auto px-5 bg-background flex flex-col">
					<HubLegacyNavigation />
					<main className="flex-1 pb-5 lg:pb-0">
						<Outlet />
					</main>
					<Footer />
				</div>
			</HydrationBoundary>
		);
	}

	return (
		<HydrationBoundary state={dehydratedState}>
			<div className="min-h-screen bg-background flex flex-col">
				{!isFocusedRoute && (
					<HubNavigation
						widthClassName={pageWidthClassName}
						accountActions={
							<CurrentUserAccountActions
								email={viewerEmail}
								managedCommunities={managedCommunities}
							/>
						}
					/>
				)}
				<main
					className={
						isFocusedRoute
							? "flex-1"
							: `mx-auto flex w-full flex-1 flex-col pb-16 ${pageWidthClassName}`
					}
				>
					<Outlet />
				</main>
				{!isFocusedRoute && <HubFooter widthClassName={pageWidthClassName} />}
			</div>
		</HydrationBoundary>
	);
}
