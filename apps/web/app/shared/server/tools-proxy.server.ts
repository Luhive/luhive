import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";

const TOOLS_ORIGIN = "https://luhive-tools.netlify.app";

export function loader() {
  return redirect("/tools/ics-generator");
}

/** Netlify served `/tools/*` from the tools site while the visitor stayed on luhive.com. */
export async function proxyTools(request: Request, splat: string) {
  const incoming = new URL(request.url);
  const target = new URL(splat, `${TOOLS_ORIGIN}/`);
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cookie");

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function proxyLoader({ request, params }: LoaderFunctionArgs) {
  return proxyTools(request, params["*"] ?? "");
}

export async function proxyAction({ request, params }: ActionFunctionArgs) {
  return proxyTools(request, params["*"] ?? "");
}
