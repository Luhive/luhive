import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import type {
  HubEventPreviewLocationState,
  HubEventSummary,
} from "~/modules/hub/model/hub-v2-types";

export const EVENT_PREVIEW_PARAM = "event";

function readPreviewState(state: unknown): HubEventPreviewLocationState | null {
  if (state && typeof state === "object" && "hubEventSummary" in state) {
    return state as HubEventPreviewLocationState;
  }
  return null;
}

/**
 * The open preview lives in `?event=<id>` so Back closes it and the URL can be
 * shared. The card's summary rides along in history state for an instant first
 * frame; a shared link without it falls back to the fetched preview.
 */
export function useEventPreviewSelection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedEventId = searchParams.get(EVENT_PREVIEW_PARAM);
  const previewState = readPreviewState(location.state);
  const selectedSummary =
    previewState?.hubEventSummary.id === selectedEventId ? previewState.hubEventSummary : null;

  const openPreview = useCallback(
    (event: HubEventSummary) => {
      const next = new URLSearchParams(searchParams);
      next.set(EVENT_PREVIEW_PARAM, event.id);
      const state: HubEventPreviewLocationState = { hubEventSummary: event };
      setSearchParams(next, {
        state,
        preventScrollReset: true,
        replace: Boolean(selectedEventId),
      });
    },
    [searchParams, selectedEventId, setSearchParams],
  );

  const closePreview = useCallback(() => {
    if (previewState) {
      navigate(-1);
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete(EVENT_PREVIEW_PARAM);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }, [navigate, previewState, searchParams, setSearchParams]);

  return { selectedEventId, selectedSummary, openPreview, closePreview };
}
