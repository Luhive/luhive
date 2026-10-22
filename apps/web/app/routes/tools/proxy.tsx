import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { proxyTools } from "~/shared/server/tools-proxy.server";

export function loader({ request, params }: LoaderFunctionArgs) {
  return proxyTools(request, params["*"] ?? "");
}

export function action({ request, params }: ActionFunctionArgs) {
  return proxyTools(request, params["*"] ?? "");
}
