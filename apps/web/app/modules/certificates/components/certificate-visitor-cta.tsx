import { Link } from "react-router";
import { Routes } from "~/shared/lib/routing/routes";

const SIGN_IN_RETURN_KEY = "post_login_return_to";

// What someone who clicked a shared certificate sees under it: one way into the
// community, and a way back for the recipient if they opened their own link signed out.
export function CertificateVisitorCta({ communityName, communitySlug }: { communityName: string; communitySlug: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-[15px] text-balance text-[#111]">
        <span className="font-medium">{communityName}</span> runs hackathons like this on Luhive.
      </p>
      <Link
        to={Routes.community.detail(communitySlug)}
        className="inline-flex h-10 items-center rounded-full bg-[#111] px-5 text-sm font-medium text-white outline-none transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-2 focus-visible:ring-[#111]/20 active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#2a2a2a]"
      >
        Join {communityName}
      </Link>
      <Link
        to={Routes.login}
        onClick={() => {
          try {
            window.localStorage.setItem(SIGN_IN_RETURN_KEY, window.location.pathname);
          } catch {
            // Storage blocked: sign-in still works, it just lands on the default page.
          }
        }}
        className="text-xs text-[#6E6E73] underline-offset-4 [@media(hover:hover)]:hover:underline"
      >
        Is this your certificate? Sign in to share it
      </Link>
    </div>
  );
}
