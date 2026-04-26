import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "admin") {
    redirect("/admin");
  }

  redirect("/profile");
}
