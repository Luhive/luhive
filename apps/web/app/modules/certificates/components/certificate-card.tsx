import type { CSSProperties } from "react";
import * as Certificate from "~/modules/certificates/model/certificate";
import * as Art from "~/modules/certificates/model/certificate-art";
import { CertificatePostmark } from "~/modules/certificates/components/certificate-postmark";
import { CertificateAwardIcon } from "~/modules/certificates/components/certificate-award-icon";
import luhiveMark from "~/assets/images/hub/luhive-mark.svg";


// Perforated stamp edge (Temani Afif's CSS stamp): round bites tiled around the
// border, a solid centre. A mask, so the card can stretch to any width.
const BITE = 7;
const stampMask = [
  `radial-gradient(${BITE}px, #0000 98%, #000) round ${-1.5 * BITE}px ${-1.5 * BITE}px / ${3 * BITE}px ${3 * BITE}px`,
  `linear-gradient(#000 0 0) no-repeat 50% / calc(100% - ${3 * BITE}px) calc(100% - ${3 * BITE}px)`,
].join(", ");
const stampStyle: CSSProperties = {
  backgroundColor: Art.PAPER,
  padding: 2 * BITE,
  mask: stampMask,
  WebkitMask: stampMask,
};

// The HTML twin of the OG image (certificate-og-image.server.tsx). Same order, same accent.
export function CertificateCard({ cert }: { cert: Certificate.PublicCertificate }) {
  const accent = Certificate.accent(cert.award);
  const eyebrow = cert.award === "participant" ? "Certificate of participation" : "Certificate of achievement";

  return (
    <div className="drop-shadow-[0_10px_18px_rgba(60,40,20,0.14)]">
      <article style={stampStyle} aria-label={`${cert.recipientName}, ${Certificate.headline(cert)}`}>
        <div
          className="relative flex flex-col gap-8 border-2 px-5 py-7 sm:gap-10 sm:px-10 sm:py-9"
          style={{ borderColor: accent }}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] sm:text-xs" style={{ color: accent }}>
              {eyebrow}
            </p>
            <span className="flex shrink-0 items-center gap-1.5 text-[15px] font-medium tracking-[-0.03em] text-[#141414]">
              <img src={luhiveMark} alt="" width={18} height={18} className="size-[18px]" />
              Luhive
            </span>
          </div>

          <div className="flex flex-col items-start">
            <p className="text-sm text-[#6E6E73]">This certifies that</p>
            <h1 className="mt-1 text-balance text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#141414] sm:text-[44px]">
              {cert.recipientName}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-medium text-white"
                style={{ backgroundColor: accent }}
              >
                <CertificateAwardIcon award={cert.award} className="size-3.5" />
                {Certificate.label(cert.award)}
              </span>
              <span className="text-base font-medium text-[#141414]">{cert.eventTitle}</span>
            </div>
            <p className="mt-3 text-sm text-[#6E6E73]">
              {Certificate.teamLabel(cert.teamName)} · {Certificate.formatDate(cert.eventDate)}
            </p>
          </div>

          <div className="min-h-[76px] pr-[120px] sm:min-h-0 sm:pr-[260px]">
            <p className="text-xs text-[#6E6E73]">Issued by</p>
            <p className="truncate text-base font-medium text-[#141414]">{cert.communityName}</p>
            <p className="mt-1 text-[11px] tracking-wider whitespace-nowrap text-[#6E6E73]">No. {Certificate.displayCode(cert.code)}</p>
          </div>

          {/* The postmark "cancels" the stamp: ink over the bottom-right corner. */}
          <div
            aria-hidden
            className="certificate-postmark pointer-events-none absolute right-2 bottom-3 flex origin-bottom-right scale-[0.68] -rotate-[9deg] items-center font-geologica opacity-[0.88] sm:right-6 sm:bottom-5 sm:scale-100"
          >
            <img
              src={Art.cancellationWavesSvg(120, 78, accent)}
              alt=""
              width={120}
              height={78}
              className="-mr-2 hidden sm:block"
            />
            <CertificatePostmark
              size={150}
              color={accent}
              topText={Art.ringText(cert.communityName, 16)}
              bottomText={Art.ringText(cert.eventTitle, 16)}
              date={Art.postmarkDate(cert.eventDate)}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
