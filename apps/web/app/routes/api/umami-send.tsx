import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { collectUmami } from "~/shared/server/umami-collect.server";

export function loader({ request }: LoaderFunctionArgs) {
  return collectUmami(request);
}

export function action({ request }: ActionFunctionArgs) {
  return collectUmami(request);
}
