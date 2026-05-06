import { redirect } from "next/navigation";
import { hasClubAccess } from "@/lib/auth/access";
import { requireAnyProfile } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const profile = await requireAnyProfile();

  if (profile.role === "admin") {
    redirect("/cabinet");
  }

  if (hasClubAccess(profile)) {
    redirect("/club");
  }

  redirect("/");
}
