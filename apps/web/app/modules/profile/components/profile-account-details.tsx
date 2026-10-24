import { profileCardClassName } from "~/modules/profile/components/profile-tokens";
import type { Profile } from "~/shared/models/entity.types";

type ProfileAccountDetailsProps = {
  user: Profile;
  email: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ProfileAccountDetails({ user, email }: ProfileAccountDetailsProps) {
  const rows = [
    { label: "Name", value: user.full_name?.trim() || "—" },
    { label: "Email", value: email || "—" },
    { label: "Bio", value: user.bio?.trim() || "—" },
    { label: "Joined", value: formatDate(user.created_at) },
    { label: "Updated", value: formatDate(user.updated_at) },
  ];

  return (
    <div className={profileCardClassName}>
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 border-b border-black/[0.06] px-4 py-3 last:border-b-0 sm:grid-cols-[140px_1fr] sm:items-baseline"
          >
            <dt className="text-[13px] font-medium text-[#8c8e9a]">{row.label}</dt>
            <dd className="text-[15px] text-[#111]">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
