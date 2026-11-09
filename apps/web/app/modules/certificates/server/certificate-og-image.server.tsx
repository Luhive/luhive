import type { ReactNode } from "react";
import * as Certificate from "~/modules/certificates/model/certificate";
import * as Art from "~/modules/certificates/model/certificate-art";
import * as Certificates from "~/modules/certificates/data/certificates-repo.server";
import { CertificatePostmark } from "~/modules/certificates/components/certificate-postmark";
import { ogFactory, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "~/shared/lib/og/og-factory";
import { loadOgFonts, loadOgMark, truncateOgText } from "~/shared/lib/og/og-assets.server";
import { publicOrigin } from "~/shared/lib/http/public-origin.server";
import { Routes } from "~/shared/lib/routing/routes";

// The URL carries `?v=<updated_at>`, so a corrected certificate gets a new image URL.
const IMAGE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "Content-Type": "image/png",
};

const KRAFT = "#EDE6DA";
const INK = "#141414";
const MUTED = "#6E6E73";

const STAMP = { x: 28, y: 28, width: OG_IMAGE_WIDTH - 56, height: OG_IMAGE_HEIGHT - 56 };
const FRAME_INSET = 22;

// Built once per instance: neither depends on the certificate.
const stampSheet = Art.perforatedStampSvg(STAMP.width, STAMP.height, Art.PAPER);
const stampShadow = Art.perforatedStampSvg(STAMP.width, STAMP.height, "rgba(60,40,20,0.10)");

function CertificateOgTemplate({ cert, markUrl }: { cert: Certificate.PublicCertificate; markUrl: string }): ReactNode {
  const accent = Certificate.accent(cert.award);
  const eyebrow = cert.award === "participant" ? "CERTIFICATE OF PARTICIPATION" : "CERTIFICATE OF ACHIEVEMENT";
  const frame = {
    left: STAMP.x + FRAME_INSET,
    top: STAMP.y + FRAME_INSET,
    width: STAMP.width - FRAME_INSET * 2,
    height: STAMP.height - FRAME_INSET * 2,
  };

  return (
    <div
      style={{
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        position: "relative",
        display: "flex",
        backgroundColor: KRAFT,
        fontFamily: "Geologica",
      }}
    >
      <img src={stampShadow} width={STAMP.width} height={STAMP.height} style={{ position: "absolute", left: STAMP.x + 4, top: STAMP.y + 6 }} />
      <img src={stampSheet} width={STAMP.width} height={STAMP.height} style={{ position: "absolute", left: STAMP.x, top: STAMP.y }} />

      <div
        style={{
          position: "absolute",
          ...frame,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px 52px 40px",
          border: `2px solid ${accent}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 17, letterSpacing: 4, color: accent }}>{eyebrow}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <img src={markUrl} width={24} height={24} style={{ width: 24, height: 24 }} />
            <div style={{ display: "flex", fontSize: 24, color: INK, letterSpacing: -1 }}>Luhive</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ display: "flex", fontSize: 21, color: MUTED }}>This certifies that</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 66, color: INK, letterSpacing: -2.4, lineHeight: 1.1 }}>
            {truncateOgText(cert.recipientName, 30)}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 22, gap: 16 }}>
            <div
              style={{
                display: "flex",
                padding: "7px 20px",
                borderRadius: 999,
                backgroundColor: accent,
                color: "#FFFFFF",
                fontSize: 23,
              }}
            >
              {Certificate.label(cert.award)}
            </div>
            <div style={{ display: "flex", fontSize: 24, color: INK }}>{truncateOgText(cert.eventTitle, 40)}</div>
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 21, color: MUTED }}>
            {`${truncateOgText(Certificate.teamLabel(cert.teamName), 40)} · ${Certificate.formatDate(cert.eventDate)}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", fontSize: 15, color: MUTED }}>Issued by</div>
          <div style={{ display: "flex", fontSize: 23, color: INK }}>{truncateOgText(cert.communityName, 36)}</div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 14, color: MUTED, letterSpacing: 1.5 }}>
            {`No. ${Certificate.displayCode(cert.code)}`}
          </div>
        </div>

      </div>


      <div
        style={{
          position: "absolute",
          right: 78,
          bottom: 60,
          display: "flex",
          alignItems: "center",
          opacity: 0.88,
          transform: "rotate(-9deg)",
        }}
      >
        <img src={Art.cancellationWavesSvg(170, 104, accent)} width={170} height={104} style={{ marginRight: -10 }} />
        <CertificatePostmark
          size={220}
          color={accent}
          topText={Art.ringText(cert.communityName, 16)}
          bottomText={Art.ringText(cert.eventTitle, 16)}
          date={Art.postmarkDate(cert.eventDate)}
        />
      </div>
    </div>
  );
}

const STORY = { width: 1080, height: 1920 };

// Instagram story (9:16): the landscape certificate, framed by a headline and the link.
// The certificate is the landscape PNG embedded as an image, so both stay identical.
function CertificateStoryTemplate({
  cert,
  markUrl,
  certificateImage,
  pageUrl,
  communityInstagram,
}: {
  cert: Certificate.PublicCertificate;
  markUrl: string;
  certificateImage: string;
  pageUrl: string;
  communityInstagram: string | null;
}): ReactNode {
  const accent = Certificate.accent(cert.award);
  const imageWidth = 1000;
  const imageHeight = Math.round((imageWidth * OG_IMAGE_HEIGHT) / OG_IMAGE_WIDTH);
  const lead = cert.award === "participant" ? "I took part in" : `${Certificate.label(cert.award)} at`;

  return (
    <div
      style={{
        width: STORY.width,
        height: STORY.height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: KRAFT,
        fontFamily: "Geologica",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 250 }}>
        <img src={markUrl} width={44} height={44} style={{ width: 44, height: 44 }} />
        <div style={{ display: "flex", fontSize: 44, color: INK, letterSpacing: -1.6 }}>Luhive</div>
      </div>

      <div style={{ display: "flex", marginTop: 110, fontSize: 64, color: accent, letterSpacing: -2 }}>{lead}</div>
      <div
        style={{
          display: "flex",
          marginTop: 12,
          maxWidth: 900,
          textAlign: "center",
          justifyContent: "center",
          fontSize: 56,
          lineHeight: 1.15,
          color: INK,
          letterSpacing: -2,
        }}
      >
        {truncateOgText(cert.eventTitle, 60)}
      </div>

      <img
        src={certificateImage}
        width={imageWidth}
        height={imageHeight}
        style={{ marginTop: 90, transform: "rotate(-2deg)", boxShadow: "0 30px 60px -20px rgba(60,40,20,0.35)" }}
      />

      {/* Handles in the image: a web page can't add mention stickers, so viewers at
          least see whom to look up, and the poster sees whom to tag. */}
      <div style={{ display: "flex", marginTop: 100, fontSize: 34, color: INK }}>
        {`${communityInstagram ?? cert.communityName} × @${Certificate.LUHIVE_INSTAGRAM}`}
      </div>
      <div style={{ display: "flex", marginTop: 40, fontSize: 28, color: MUTED }}>Verify it at</div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 30, color: INK }}>
        {pageUrl.replace(/^https?:\/\//, "")}
      </div>
    </div>
  );
}

/** `format=story` gives the 1080×1920 Instagram story image; anything else the 1200×630 card. */
export async function generateCertificateOgImage(
  request: Request,
  code: string | undefined,
  format: "card" | "story" = "card",
): Promise<Response> {
  const cert = code ? await Certificates.findByCode(code) : null;
  if (!cert) return new Response("Not found", { status: 404 });

  const origin = publicOrigin(request);
  const [fonts, markUrl] = await Promise.all([loadOgFonts(origin), loadOgMark(origin)]);
  const card = await ogFactory.render(<CertificateOgTemplate cert={cert} markUrl={markUrl} />, {
    fonts,
    headers: IMAGE_HEADERS,
  });
  if (format === "card") return card;

  const certificateImage = `data:image/png;base64,${Buffer.from(await card.arrayBuffer()).toString("base64")}`;
  return ogFactory.render(
    <CertificateStoryTemplate
      cert={cert}
      markUrl={markUrl}
      certificateImage={certificateImage}
      pageUrl={`${origin}${Routes.certificate(cert.code)}`}
      communityInstagram={Certificate.instagramHandle(
        await Certificates.findCommunityInstagram(cert.communitySlug).catch(() => null),
      )}
    />,
    { fonts, headers: IMAGE_HEADERS, width: STORY.width, height: STORY.height },
  );
}
