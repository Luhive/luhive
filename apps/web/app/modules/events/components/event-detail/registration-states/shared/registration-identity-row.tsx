import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "~/shared/components/ui/avatar";
import { cn } from "~/shared/lib/utils/cn";
import { eventRegistrationRootKey } from "~/shared/lib/query/query-keys";
import {
	PROFILE_NAME_MAX as NAME_MAX,
	PROFILE_NAME_MIN as NAME_MIN,
	normalizeProfileName,
	type ProfileNameActionData,
} from "~/modules/profile/model/profile-name";

const iconButtonClass =
	"inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground";

interface RegistrationIdentityRowProps {
	displayName: string;
	avatarUrl?: string | null;
	avatarInitials?: string;
	trailing?: React.ReactNode;
	/** Lets the signed-in user fix their name in place; saves to their profile. */
	editable?: {
		/** The profile's stored name; empty when the display name is an email fallback. */
		fullName: string | null;
		/** Ask once whether the name taken from Google (or another provider) is right. */
		askToConfirm?: boolean;
	};
}

export function RegistrationIdentityRow({
	displayName,
	avatarUrl,
	avatarInitials,
	trailing,
	editable,
}: RegistrationIdentityRowProps) {
	const fetcher = useFetcher<ProfileNameActionData>();
	const queryClient = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [confirmDismissed, setConfirmDismissed] = useState(false);

	const pendingName = fetcher.formData?.get("fullName");
	const savedName =
		fetcher.data?.success === true ? fetcher.data.fullName : null;
	// Show the new name immediately while saving, then whatever the server stored.
	const shownName =
		typeof pendingName === "string" ? pendingName : (savedName ?? displayName);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (fetcher.data.success) {
			// The event page also caches user state in React Query; refresh it with the new name.
			queryClient.invalidateQueries({ queryKey: eventRegistrationRootKey });
		} else {
			setError(fetcher.data.error);
			setIsEditing(true);
		}
	}, [fetcher.state, fetcher.data, queryClient]);

	const startEditing = () => {
		setDraft(editable?.fullName?.trim() || savedName || "");
		setError(null);
		setIsEditing(true);
		setConfirmDismissed(true);
	};

	useEffect(() => {
		if (isEditing) inputRef.current?.select();
	}, [isEditing]);

	const save = (name: string) => {
		const value = normalizeProfileName(name);
		if (value.length < NAME_MIN) {
			setError(`Name must be at least ${NAME_MIN} characters`);
			return;
		}
		setError(null);
		setIsEditing(false);
		setConfirmDismissed(true);
		fetcher.submit(
			{ fullName: value },
			{ method: "post", action: "/api/profile/name" },
		);
	};

	const showConfirmPrompt =
		!!editable?.askToConfirm &&
		!confirmDismissed &&
		!isEditing &&
		!!editable.fullName?.trim();

	return (
		<div className="space-y-1.5 min-w-0">
			<div className="flex items-center justify-between gap-2 min-w-0">
				<div className="flex flex-1 items-center gap-2 min-w-0">
					<Avatar className="h-7 w-7 shrink-0">
						<AvatarImage src={avatarUrl || undefined} alt={shownName} />
						<AvatarFallback className="bg-primary/10 text-primary text-[10px]">
							{avatarInitials}
						</AvatarFallback>
					</Avatar>

					{isEditing ? (
						<form
							className="flex flex-1 items-center gap-1 min-w-0"
							onSubmit={(e) => {
								e.preventDefault();
								save(draft);
							}}
						>
							<input
								ref={inputRef}
								value={draft}
								onChange={(e) => {
									setDraft(e.target.value);
									if (error) setError(null);
								}}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										e.preventDefault();
										setIsEditing(false);
										setError(null);
									}
								}}
								maxLength={NAME_MAX}
								autoComplete="name"
								aria-label="Your name"
								aria-invalid={!!error || undefined}
								placeholder="Your full name"
								className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm font-semibold outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
							/>
							<button
								type="submit"
								aria-label="Save name"
								className={cn(iconButtonClass, "text-primary")}
							>
								<Check className="size-4" />
							</button>
							<button
								type="button"
								aria-label="Cancel editing name"
								onClick={() => {
									setIsEditing(false);
									setError(null);
								}}
								className={iconButtonClass}
							>
								<X className="size-4" />
							</button>
						</form>
					) : (
						<div className="flex items-center gap-0.5 min-w-0">
							<p className="text-sm font-semibold text-foreground truncate">
								{shownName}
							</p>
							{editable && (
								<button
									type="button"
									onClick={startEditing}
									disabled={fetcher.state !== "idle"}
									aria-label="Edit your name"
									title="Edit your name"
									className={cn(iconButtonClass, "size-6")}
								>
									<Pencil className="size-3" />
								</button>
							)}
						</div>
					)}
				</div>
				{!isEditing && trailing}
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}

			{showConfirmPrompt && (
				<div className="animate-hub-fade-in flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted/50 px-2.5 py-1.5">
					<p className="text-xs text-muted-foreground">
						Is this the name organizers should see?
					</p>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={startEditing}
							className="rounded px-1.5 py-0.5 text-xs font-medium text-foreground transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-background"
						>
							Edit
						</button>
						<button
							type="button"
							onClick={() => save(editable?.fullName ?? "")}
							className="rounded px-1.5 py-0.5 text-xs font-medium text-primary transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-background"
						>
							Looks good
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
