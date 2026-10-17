import { useLocation, useNavigation } from "react-router";

/**
 * True while the router moves to another page or submits a form.
 * Same-page search changes (drawers, filters) are excluded; they own their loading UI.
 */
export function useIsPageNavigationPending() {
  const navigation = useNavigation();
  const location = useLocation();

  if (navigation.state === "idle") return false;
  return (
    navigation.formMethod !== undefined ||
    navigation.location.pathname !== location.pathname
  );
}
