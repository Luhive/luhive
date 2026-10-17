import { TopNavigation } from "~/shared/components/navigation";
import { Card, CardContent, CardHeader } from "~/shared/components/ui/card";
import { Skeleton } from "~/shared/components/ui/skeleton";
import { Avatar } from "~/shared/components/ui/avatar";
import { Sparkle } from "lucide-react";

interface HubLegacyPageSkeletonProps {
	user?: { id: string } | null;
}

export function HubLegacyPageSkeleton({ user }: HubLegacyPageSkeletonProps) {
	return (
		<>
			{/* <TopNavigation user={user} /> */}
			<main className="py-8">
				<div className="mb-8">
					<div className="flex items-center gap-3">
						<Sparkle className="h-8 w-8 mb-2 text-primary animate-sparkle" />
						<h1 className="text-4xl font-black tracking-tight mb-2">Explore Communities</h1>
					</div>
					<p className="text-lg text-muted-foreground">
						Discover amazing communities and connect with like-minded people
					</p>
				</div>

				{/* Skeleton Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i} className="h-full gap-5 border shadow-none">
							<CardHeader className="pb-2">
								<div className="flex items-start gap-4">
									<Avatar className="h-16 w-16 border-2">
										<Skeleton className="h-16 w-16 rounded-full bg-muted" />
									</Avatar>
									<div className="flex-1 min-w-0 overflow-hidden">
										<Skeleton className="mb-2 h-12 w-full bg-muted" />
										<Skeleton className="h-4 w-24 bg-muted" />
									</div>
								</div>
								<div className="flex items-center gap-2 mt-2">
									<Skeleton className="h-5 w-16 rounded-full bg-muted" />
									<Skeleton className="h-5 w-20 rounded-full bg-muted" />
								</div>
							</CardHeader>
							<CardContent className="space-y-2">
								<Skeleton className="h-4 w-full bg-muted" />
								<Skeleton className="h-4 w-full bg-muted" />
								<div className="flex items-center gap-4">
									<Skeleton className="h-4 w-12 bg-muted" />
									<Skeleton className="h-4 w-12 bg-muted" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</main>
		</>
	);
}

