import type { EventPreviewLayout } from "~/modules/hub/model/hub-v2-types";

// Temporary: compares drawer layouts via `?drawer=panel|stretch|wide`. Remove once one is chosen.
export const EVENT_PREVIEW_LAYOUT_PARAM = "drawer";

export function getEventPreviewLayout(value: string | null): EventPreviewLayout {
  return value === "stretch" || value === "wide" ? value : "panel";
}
