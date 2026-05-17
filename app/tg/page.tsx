import { redirect } from "next/navigation";
import { hasClubAccess } from "@/lib/auth/access";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";

export default async function TelegramEntryPage() {
  const profile = await getTelegramProfileFromSession();

  if (!profile) {
    return null;
  }

  if (profile.role === "admin") {
    redirect("/tg/admin");
  }

  redirect(hasClubAccess(profile) ? "/tg/content" : "/tg/support");
}
