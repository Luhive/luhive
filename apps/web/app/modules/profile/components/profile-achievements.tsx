import { Link } from "react-router";
import * as Certificate from "~/modules/certificates/model/certificate";
import { CertificateAwardIcon } from "~/modules/certificates/components/certificate-award-icon";
import { profileCardClassName, profilePressClassName } from "~/modules/profile/components/profile-tokens";
import { Routes } from "~/shared/lib/routing/routes";

// Hackathon certificates as badges. Each one opens its public certificate page.
// Renders nothing for people without a certificate.
export function ProfileAchievements({ badges }: { badges: Certificate.Badge[] }) {
  if (badges.length === 0) return null;

  return (
    <section className={`${profileCardClassName} p-4`} aria-labelledby="profile-achievements">
      <h2 id="profile-achievements" className="mb-3 text-[13px] font-medium text-[#6e6e73]">
        Achievements
      </h2>
      <ul className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <li key={badge.code}>
            <Link
              to={Routes.certificate(badge.code)}
              className={`flex items-center gap-2 rounded-full border bg-white py-1.5 pr-3.5 pl-2 text-[13px] text-[#111] ${profilePressClassName}`}
              style={{ borderColor: `${Certificate.accent(badge.award)}66` }}
            >
              <span className="flex items-center gap-1.5 font-medium" style={{ color: Certificate.accent(badge.award) }}>
                <CertificateAwardIcon award={badge.award} className="size-4 shrink-0" />
                {Certificate.label(badge.award)}
              </span>
              <span className="text-[#6e6e73]">· {badge.eventTitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
