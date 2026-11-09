import { useEffect, type CSSProperties } from "react";
import { BadgeCheck } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import * as Certificate from "~/modules/certificates/model/certificate";
import { CertificateCard } from "~/modules/certificates/components/certificate-card";
import { CertificateShareBar } from "~/modules/certificates/components/certificate-share-bar";
import { CertificateVisitorCta } from "~/modules/certificates/components/certificate-visitor-cta";
import type { CertificateLoaderData } from "~/modules/certificates/server/certificate-loader.server";
import { Routes } from "~/shared/lib/routing/routes";

// Card first, then the actions, then the verified line: a short stagger on first view.
const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

export { loader } from "~/modules/certificates/server/certificate-loader.server";
export { meta } from "~/modules/certificates/model/certificate-meta";

// Spec: docs/hackathon-certificates.md. Public by link, no sign-in. The owner gets
// the share actions; anyone else gets a way into the community.
export default function CertificatePage() {
  const { cert, imageUrl, share } = useLoaderData<CertificateLoaderData>();

  // The owner key (`?k=`, from their email) mustn't travel when they copy the address
  // bar: drop it so whoever opens that link gets the visitor view. A reload needs the
  // email link again (or sign-in).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("k")) return;
    url.searchParams.delete("k");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [cert.updatedAt]);

  return (
    // The shared web layout (routes/web/layout.tsx) draws the hub navigation and footer.
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-6 font-inter text-[#111] md:pt-10">
      <div className="animate-hub-rise" style={rise(0)}>
        <CertificateCard cert={cert} />
      </div>

      <div className="animate-hub-rise" style={rise(80)}>
        {share ? (
          <CertificateShareBar cert={cert} imageUrl={imageUrl} links={share} />
        ) : (
          <CertificateVisitorCta communityName={cert.communityName} communitySlug={cert.communitySlug} />
        )}
      </div>

      {/* Inline icon, so a wrapped line keeps the check next to its text. */}
      <p className="animate-hub-rise text-center text-xs text-balance text-[#6E6E73]" style={rise(140)}>
        <BadgeCheck className="mr-1 inline size-4 align-[-3px] text-[#1a8f4c]" aria-hidden />
        Verified · issued {Certificate.formatDate(cert.issuedAt)} by {cert.communityName} via Luhive
      </p>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center font-inter">
      <h1 className="text-xl font-semibold text-[#111]">Certificate not found</h1>
      <p className="max-w-sm text-sm text-[#6E6E73]">The link may be wrong, or the organizer withdrew this certificate.</p>
      <Link to={Routes.landing} className="mt-2 text-sm font-medium text-[#111] underline underline-offset-4">
        Go to Luhive
      </Link>
    </div>
  );
}
