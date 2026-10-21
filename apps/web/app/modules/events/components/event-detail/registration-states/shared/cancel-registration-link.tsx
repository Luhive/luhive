import { Form, useActionData } from "react-router";
import type { EventDetailActionData } from "~/modules/events/model/event-detail-view.types";

interface CancelRegistrationLinkProps {
	isUnregistering: boolean;
}

export function CancelRegistrationLink({ isUnregistering }: CancelRegistrationLinkProps) {
	const actionData = useActionData<EventDetailActionData>();
	const contactUrl = actionData?.success === false ? actionData.contactUrl : undefined;

	return (
		<Form method="post">
			<input type="hidden" name="intent" value="unregister" />
			<p className="text-xs text-muted-foreground">
				Can&apos;t attend? Notify the host by{" "}
				<button
					type="submit"
					disabled={isUnregistering}
					className="text-destructive underline font-medium disabled:opacity-50"
				>
					{isUnregistering ? "canceling..." : "canceling"}
				</button>{" "}
				your registration.
			</p>
			{contactUrl ? (
				<p className="mt-1 text-xs text-muted-foreground">
					Paid tickets are cancelled by the organiser.{" "}
					<a href={contactUrl} className="font-medium text-foreground underline">
						Contact organiser
					</a>
				</p>
			) : null}
		</Form>
	);
}
