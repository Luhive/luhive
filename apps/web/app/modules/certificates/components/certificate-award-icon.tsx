import { Award, Medal } from "lucide-react";
import type * as Certificate from "~/modules/certificates/model/certificate";

// A line icon, never an emoji: emoji render differently on every platform.
export function CertificateAwardIcon({ award, className }: { award: Certificate.Award; className?: string }) {
  const Icon = award === "participant" ? Award : Medal;
  return <Icon className={className} strokeWidth={2.25} aria-hidden />;
}
