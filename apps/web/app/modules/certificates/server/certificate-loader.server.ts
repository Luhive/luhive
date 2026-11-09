import { data, type LoaderFunctionArgs } from "react-router";
import * as Certificate from "~/modules/certificates/model/certificate";
import * as Certificates from "~/modules/certificates/data/certificates-repo.server";
import * as CertificateOwner from "~/modules/certificates/server/certificate-owner.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";
import { Routes } from "~/shared/lib/routing/routes";
import { requestSupabaseContext } from "~/shared/lib/supabase/request-supabase-context.server";

// Link-preview crawlers open the page to build the card; they aren't visitors.
const CRAWLER = /bot|crawl|spider|slurp|facebookexternalhit|linkedin|whatsapp|telegram|discord|skype|embedly|preview|pinterest|vkshare/i;

/** What only the owner's page needs: every share link, tagged for tracing. */
export type CertificateShareLinks = {
  copyUrl: string;
  linkedInProfileUrl: string;
  linkedInPostUrl: string;
  linkedInCaption: string;
  storyImageUrl: string;
  /** "@handle" of the hosting community on Instagram, for the tag prompt. */
  communityInstagram: string | null;
};

export type CertificateLoaderData = {
  cert: Certificate.PublicCertificate;
  pageUrl: string;
  /** The 1200×630 card: link previews for everyone, the download for the owner. */
  imageUrl: string;
  /** Owner: signed in as the recipient, or holding the key from their email (`?k=`). */
  share: CertificateShareLinks | null;
};

export async function loader({ request, params, context }: LoaderFunctionArgs): Promise<CertificateLoaderData> {
  const code = params.code?.toLowerCase() ?? "";
  const found = /^[a-z0-9]{10}$/.test(code) ? await Certificates.findWithOwner(code) : null;
  if (!found) throw data("Certificate not found", { status: 404 });
  const { cert, ownerId } = found;

  const url = new URL(request.url);
  const { findAuthUser } = context.get(requestSupabaseContext);
  const viewer = await findAuthUser();
  const ownerKey = url.searchParams.get("k");
  const isOwner = CertificateOwner.isOwner({ code, key: ownerKey, ownerId, viewerId: viewer?.id ?? null });

  const origin = publicOrigin(request);
  const pageUrl = `${origin}${Routes.certificate(cert.code)}`;
  const imageUrl = `${origin}${Routes.og.certificate(cert.code, cert.updatedAt)}`;

  if (!isOwner) {
    if (!CRAWLER.test(request.headers.get("user-agent") ?? "")) {
      await Certificates.recordEvent(cert.code, "view", Certificate.visitChannel(url.searchParams.get("utm_source")));
    }
    return { cert, pageUrl, imageUrl, share: null };
  }

  const communityInstagram = Certificate.instagramHandle(
    await Certificates.findCommunityInstagram(cert.communitySlug).catch(() => null),
  );
  const postUrl = Certificate.sharedUrl(pageUrl, "linkedin", "post");
  const linkedInCaption = Certificate.postCaption(cert, postUrl);
  return {
    cert,
    pageUrl,
    imageUrl,
    share: {
      copyUrl: Certificate.sharedUrl(pageUrl, "copy"),
      linkedInProfileUrl: Certificate.linkedInAddToProfileUrl(
        cert,
        Certificate.sharedUrl(pageUrl, "linkedin", "profile"),
        Certificate.LUHIVE_LINKEDIN_ORGANIZATION_ID,
      ),
      linkedInPostUrl: Certificate.linkedInPostUrl(linkedInCaption),
      linkedInCaption,
      storyImageUrl: `${origin}${Routes.og.certificateStory(cert.code, cert.updatedAt)}`,
      communityInstagram,
    },
  };
}
