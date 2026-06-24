import { redirect } from "next/navigation";
import { hasClubAccess } from "@/lib/auth/access";
import { hasApprovedPurchasedPosts } from "@/lib/data/post-purchases";
import { getTelegramProfileFromSession } from "@/lib/telegram/auth";
import { buildLocalPreviewProfile, isLocalTelegramPreviewEnabled } from "@/lib/telegram/local-preview";

export default async function TelegramEntryPage() {
  const profile = (await getTelegramProfileFromSession()) ??
    ((await isLocalTelegramPreviewEnabled()) ? buildLocalPreviewProfile() : null);

  if (!profile) {
    return null;
  }

  if (profile.role === "admin") {
    redirect("/tg/admin/posts");
  }

  redirect(hasClubAccess(profile) || (await hasApprovedPurchasedPosts(profile)) ? "/tg/content" : "/tg/tiers");
}
