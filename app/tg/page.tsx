import { redirect } from "next/navigation";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { isLocalTelegramPreviewEnabled, resolveLocalPreviewProfile } from "@/lib/telegram/local-preview";

export default async function TelegramEntryPage() {
  const profile = (await getTelegramProfileFromSession()) ??
    ((await isLocalTelegramPreviewEnabled()) ? await resolveLocalPreviewProfile() : null);

  if (!profile) {
    return null;
  }

  if (profile.role === "admin") {
    redirect("/tg/admin/posts");
  }

  redirect("/tg/content");
}
