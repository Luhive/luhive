import type { MetaFunction } from "react-router";
import * as Certificate from "~/modules/certificates/model/certificate";
import type { CertificateLoaderData } from "~/modules/certificates/server/certificate-loader.server";

// Public by link, not by search: noindex, but every social preview tag is present.
export const meta: MetaFunction = ({ data }) => {
  const loaded = data as CertificateLoaderData | undefined;
  if (!loaded) return [{ title: "Certificate not found · Luhive" }, { name: "robots", content: "noindex" }];

  const { cert, pageUrl, imageUrl } = loaded;
  const title = `${cert.recipientName}: ${Certificate.headline(cert)}`;
  const description = `${Certificate.label(cert.award)} with ${Certificate.teamLabel(cert.teamName)}. Issued by ${cert.communityName} on Luhive.`;

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "noindex, nofollow" },
    { tagName: "link", rel: "canonical", href: pageUrl },

    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Luhive" },
    { property: "og:url", content: pageUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: title },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@luhive_" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
  ];
};
