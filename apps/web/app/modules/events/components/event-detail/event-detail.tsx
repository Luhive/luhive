import { useEffect, useMemo, useRef } from "react";
import { useNavigation } from "react-router";
import { Routes } from "~/shared/lib/routing/routes";
import { publicEventSlug } from "~/modules/events/utils/event-slug";
import { useRegistrationTimer } from "~/modules/events/hooks/use-registration-timer";
import { useEventDetailToasts } from "~/modules/events/hooks/use-event-detail-toasts";
import { EventSidebarPanel } from "./event-sidebar-panel";
import { EventInfoSection } from "./event-info-section";
import type { ExternalPlatform } from "~/modules/events/model/event.types";
import type { EventDetailLoaderData } from "~/modules/events/server/event-detail-loader.server";
import { handleShare } from "../../utils/share-event";
import {
	getEventTrackingContext,
	shouldTrackEventVisit,
} from "~/modules/events/utils/event-session-tracker";

async function getPublicIp(): Promise<string | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1200);
		const res = await fetch("https://api.ipify.org?format=json", {
			method: "GET",
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!res.ok) return null;
		const data = (await res.json()) as { ip?: string };
		return typeof data.ip === "string" ? data.ip : null;
	} catch {
		return null;
	}
}

async function getPublicIpCached(): Promise<string | null> {
	try {
		const key = "luhive_public_ip";
		const cached = window.sessionStorage.getItem(key);
		if (cached) return cached;
		const ip = await getPublicIp();
		if (ip) window.sessionStorage.setItem(key, ip);
		return ip;
	} catch {
		return null;
	}
}

type PublicGeo = {
	ip: string;
	country: string | null;
	city: string | null;
	region: string | null;
	timezone: string | null;
};

async function getPublicGeoCached(): Promise<PublicGeo | null> {
	try {
		const key = "luhive_public_geo_v1";
		const cached = window.sessionStorage.getItem(key);
		if (cached) {
			const parsed = JSON.parse(cached) as Partial<PublicGeo>;
			if (typeof parsed.ip === "string" && parsed.ip) {
				return {
					ip: parsed.ip,
					country: typeof parsed.country === "string" ? parsed.country : null,
					city: typeof parsed.city === "string" ? parsed.city : null,
					region: typeof parsed.region === "string" ? parsed.region : null,
					timezone: typeof parsed.timezone === "string" ? parsed.timezone : null,
				};
			}
		}

		const ip = await getPublicIpCached();
		if (!ip) return null;

		async function tryFetchJson(url: string): Promise<any | null> {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 1500);
				const res = await fetch(url, { method: "GET", signal: controller.signal });
				clearTimeout(timeout);
				if (!res.ok) return null;
				return await res.json();
			} catch {
				return null;
			}
		}

		const ipWho = await tryFetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
		const ipApiCo = ipWho
			? null
			: await tryFetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);

		const geo: PublicGeo = {
			ip,
			country:
				typeof ipWho?.country === "string"
					? ipWho.country
					: typeof ipApiCo?.country_name === "string"
						? ipApiCo.country_name
						: null,
			city:
				typeof ipWho?.city === "string"
					? ipWho.city
					: typeof ipApiCo?.city === "string"
						? ipApiCo.city
						: null,
			region:
				typeof ipWho?.region === "string"
					? ipWho.region
					: typeof ipApiCo?.region === "string"
						? ipApiCo.region
						: null,
			timezone:
				typeof ipWho?.timezone?.id === "string"
					? ipWho.timezone.id
					: typeof ipApiCo?.timezone === "string"
						? ipApiCo.timezone
						: null,
		};

		window.sessionStorage.setItem(key, JSON.stringify(geo));
		return geo;
	} catch {
		return null;
	}
}

export function EventDetail({
	event,
	community,
	userData,
	isPastEvent,
	capacityPercentage,
	hasCustomQuestions,
	isExternalEvent,
	externalPlatformName,
	registrationDeadlineFormatted,
	hostingCommunities,
	highlightRegistrationCard = false,
	isRegisterOpen = false,
	hackathon = null,
}: EventDetailLoaderData & {
	highlightRegistrationCard?: boolean;
	isRegisterOpen?: boolean;
}) {
	const navigation = useNavigation();
	const lastSubmittedIntentRef = useRef<string | null>(null);

	const timeRemaining = useRegistrationTimer(event.registration_deadline, event.timezone);
	useEventDetailToasts({
		eventId: event.id,
		submittedIntentRef: lastSubmittedIntentRef,
	});

	const submittingIntent = navigation.formData?.get("intent") as string | null;
	const isRegistering = navigation.state === "submitting" && submittingIntent === "register";
	const isUnregistering = navigation.state === "submitting" && submittingIntent === "unregister";

	const externalPlatform = event.external_platform as ExternalPlatform | null;
	const trackingContext = useMemo(() => getEventTrackingContext(event.id), [event.id]);

	useEffect(() => {
		if (!event.id || !shouldTrackEventVisit(event.id)) {
			return;
		}

		let cancelled = false;
		(async () => {
			const geo = await getPublicGeoCached();
			if (cancelled) return;

			const formData = new FormData();
			formData.append("intent", "track_visit");
			formData.append("eventId", event.id);
			formData.append("communityId", community.id);
			formData.append("sessionId", trackingContext.sessionId);
			formData.append("utmSource", trackingContext.utmSource);
			if (geo?.ip) formData.append("clientIp", geo.ip);
			if (geo?.country) formData.append("clientCountry", geo.country);
			if (geo?.city) formData.append("clientCity", geo.city);
			if (geo?.region) formData.append("clientRegion", geo.region);
			if (geo?.timezone) formData.append("clientTimezone", geo.timezone);
			if (trackingContext.utmMedium) formData.append("utmMedium", trackingContext.utmMedium);
			if (trackingContext.utmCampaign) formData.append("utmCampaign", trackingContext.utmCampaign);
			if (trackingContext.utmContent) formData.append("utmContent", trackingContext.utmContent);
			if (trackingContext.utmTerm) formData.append("utmTerm", trackingContext.utmTerm);
			if (trackingContext.referrerUrl) formData.append("referrerUrl", trackingContext.referrerUrl);
			if (trackingContext.referrerDomain) formData.append("referrerDomain", trackingContext.referrerDomain);

			fetch(Routes.community.event(community.slug, publicEventSlug(event)), {
				method: "POST",
				body: formData,
			}).catch((error) => {
				console.error("Failed to track event visit:", error);
			});
		})();

		return () => {
			cancelled = true;
		};
	}, [
		community.id,
		community.slug,
		event.id,
		trackingContext.referrerDomain,
		trackingContext.referrerUrl,
		trackingContext.sessionId,
		trackingContext.utmCampaign,
		trackingContext.utmContent,
		trackingContext.utmMedium,
		trackingContext.utmSource,
		trackingContext.utmTerm,
	]);

	return (
		<main className="py-6 md:py-10">
			<div className="flex flex-col lg:grid lg:grid-cols-[400px_1fr] gap-4 lg:gap-12">
				<EventSidebarPanel
					event={event}
					community={community}
					userData={userData}
					isPastEvent={isPastEvent}
					capacityPercentage={capacityPercentage}
					isExternalEvent={isExternalEvent}
					onShare={() => handleShare(event)}
					hostingCommunities={hostingCommunities}
				/>
				<EventInfoSection
					event={event}
					community={community}
					userData={userData}
					timeRemaining={timeRemaining}
					registrationDeadlineFormatted={registrationDeadlineFormatted}
					hasCustomQuestions={hasCustomQuestions}
					isPastEvent={isPastEvent}
					isExternalEvent={isExternalEvent}
					externalPlatform={externalPlatform}
					externalPlatformName={externalPlatformName}
					isRegistering={isRegistering}
					isUnregistering={isUnregistering}
					eventTrackingContext={trackingContext}
					highlightRegistrationCard={highlightRegistrationCard}
					isRegisterOpen={isRegisterOpen}
					hackathon={hackathon}
				/>
			</div>
		</main>
	);
}
