import { EVENT_PREVIEW_PARAM } from "~/modules/hub/hooks/use-event-preview-selection";

function withoutPreviewParam(url: URL) {
  const params = new URLSearchParams(url.search);
  params.delete(EVENT_PREVIEW_PARAM);
  params.sort();
  return `${url.pathname}?${params.toString()}`;
}

/** True when a navigation only opens, switches or closes the event preview. */
export function isEventPreviewChange(currentUrl: URL, nextUrl: URL) {
  return withoutPreviewParam(currentUrl) === withoutPreviewParam(nextUrl);
}
