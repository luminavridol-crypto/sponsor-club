export const dynamic = "force-dynamic";

import { AdminUsersChatPanel } from "@/components/admin/admin-users-chat-panel";
import {
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_SHELL_CLASS
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";

export default async function TelegramAdminChatPage({
  searchParams
}: {
  searchParams?: Promise<{ chat?: string | string[] }>;
}) {
  const profile = await requireAdmin();
  const params = (await searchParams) ?? {};
  const selectedChatId =
    typeof params.chat === "string" ? params.chat : Array.isArray(params.chat) ? params.chat[0] : undefined;

  return (
    <MiniAppShell
      profile={profile}
      title="Участники"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <AdminUsersChatPanel selectedProfileId={selectedChatId} />
    </MiniAppShell>
  );
}
