import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useMatches,
} from "react-router";
import { useEffect } from "react";

import { analytics } from "~/shared/lib/analytics/analytics";
import { readFirstTouchSource } from "~/shared/lib/first-touch.server";

import type { Route } from "./+types/root";
import "./app.css";
import manrope400Url from "./assets/fonts/manrope-v20-latin_latin-ext-regular.woff2?url";
import manrope500Url from "./assets/fonts/manrope-v20-latin_latin-ext-500.woff2?url";
import manrope600Url from "./assets/fonts/manrope-v20-latin_latin-ext-600.woff2?url";
import manrope700Url from "./assets/fonts/manrope-v20-latin_latin-ext-700.woff2?url";
import { Toaster } from "~/shared/components/ui/sonner";
import ErrorComponent from "./routes/error";
import { QueryProvider } from "~/shared/lib/query/query-provider";

export async function loader({ request }: Route.LoaderArgs) {
  return { firstTouchSource: readFirstTouchSource(request) };
}

export const links: Route.LinksFunction = () => [
  // Preload local Manrope font files for faster first paint
  { rel: "preload", href: manrope400Url, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: manrope500Url, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: manrope600Url, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: manrope700Url, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  // Nunito font for landing page logo
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;500;600;700;800;900&display=swap" },
];

const DEFAULT_VIEWPORT = "width=device-width, initial-scale=1";

/** Routes opt into edge-to-edge layout with `handle = { viewportFit: "cover" }`. */
function useViewportContent() {
  const matches = useMatches();
  const isEdgeToEdge = matches.some(
    (match) => (match.handle as { viewportFit?: string } | undefined)?.viewportFit === "cover",
  );
  return isEdgeToEdge ? `${DEFAULT_VIEWPORT}, viewport-fit=cover` : DEFAULT_VIEWPORT;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const viewportContent = useViewportContent();

  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content={viewportContent} />
        <Meta />
        <Links />
        <script
          defer
          src="/stats.js"
          data-website-id="f5c72579-b361-4002-bda5-bd5ffb7e247d"
          data-host-url="https://luhive.com"
          data-tag="main"
          data-domains="luhive.com"
          data-performance="true"
        />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {

  return (
    <QueryProvider>
      <Outlet />
    </QueryProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (!isRouteErrorResponse(error)) {
    console.error(error);
  }


  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message || details;
    stack = error.stack;
  }

  return <ErrorComponent message={message} details={details} stack={stack} />;
}
