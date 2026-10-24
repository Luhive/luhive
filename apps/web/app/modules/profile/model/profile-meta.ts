import type { ProfileLoaderData } from "~/modules/profile/model/profile-loader";

export function meta({ data }: { data?: ProfileLoaderData }) {
  const user = data?.user;
  return [
    {
      title: user?.full_name ? `${user.full_name} - Profile` : "Profile - Luhive",
    },
    { name: "description", content: "User Profile in Luhive" },
  ];
}
