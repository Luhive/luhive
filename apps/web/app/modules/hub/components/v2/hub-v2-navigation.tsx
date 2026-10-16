import type { ReactNode } from "react";
import { HubBrand } from "~/modules/hub/components/v2/hub-brand";
// import { HubSearchField } from "~/modules/hub/components/v2/hub-search-field";

type HubV2NavigationProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  accountActions: ReactNode;
};

export function HubV2Navigation({ accountActions }: HubV2NavigationProps) {
  return (
    <header className="z-40 w-full bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 md:sticky md:top-0">
      <div className="mx-auto grid w-full max-w-[1040px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-5 pb-3 pt-4 md:h-[72px] md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-6 md:py-0">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center">
          <HubBrand />
        </div>
        {/* Search is hidden for now; restore with `searchQuery` / `onSearchQueryChange`.
        <HubSearchField
          value={searchQuery}
          onValueChange={onSearchQueryChange}
          className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1"
        />
        */}
        <div className="col-start-2 row-start-1 flex items-center justify-end md:col-start-3">
          {accountActions}
        </div>
      </div>
    </header>
  );
}
