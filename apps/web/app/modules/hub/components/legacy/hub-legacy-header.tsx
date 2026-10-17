import { Sparkle } from "lucide-react";

export function HubLegacyHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <Sparkle className="h-8 w-8 mb-2 text-primary animate-sparkle" />
        <h1 className="text-4xl font-black tracking-tight mb-2">
          Explore Communities
        </h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Discover amazing communities and connect with like-minded people
      </p>
    </div>
  );
}
