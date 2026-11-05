import { Link } from "react-router";
import {
  profileCardClassName,
  profileSecondaryButtonClassName,
} from "~/modules/profile/components/profile-tokens";
import { Routes } from "~/shared/lib/routing/routes";

export function AdminInviteInvalid() {
  return (
    <div className={`${profileCardClassName} p-6`}>
      <h1 className="text-[20px] font-semibold tracking-tight text-[#111]">This invite is no longer valid</h1>
      <p className="mt-2 text-[14px] text-[#6e6e73]">
        It was revoked or already accepted. Ask the community owner to send a new one.
      </p>
      <Link to={Routes.home} className={`${profileSecondaryButtonClassName} mt-5`}>
        Go home
      </Link>
    </div>
  );
}
