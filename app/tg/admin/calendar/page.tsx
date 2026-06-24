export const dynamic = "force-dynamic";

import { BirthdayCalendar } from "@/components/admin/birthday-calendar";
import {
  ADMIN_EYEBROW_CLASS,
  ADMIN_HEADER_CLASS,
  ADMIN_SHELL_CLASS
} from "@/components/admin/theme";
import { MiniAppShell } from "@/components/telegram/mini-app-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";
import { normalizeProfileTier, TIER_LABELS } from "@/lib/utils/tier";

export default async function TelegramAdminCalendarPage() {
  const profile = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data: profilesData } = await admin.from("profiles").select("*");

  const activeUsers = ((profilesData ?? []) as Profile[])
    .map((user) => normalizeProfileTier(user))
    .filter((user) => user.role !== "admin" && user.access_status === "active");

  const birthdayPeople = activeUsers
    .filter((person) => Boolean(person.birth_date))
    .map((person) => ({
      id: person.id,
      displayName: person.display_name || person.email || "Участник",
      birthDate: person.birth_date as string,
      tierLabel: TIER_LABELS[person.tier],
      tierKey: person.tier
    }));

  return (
    <MiniAppShell
      profile={profile}
      title="Календарь"
      shellClassName={ADMIN_SHELL_CLASS}
      headerClassName={ADMIN_HEADER_CLASS}
      eyebrowClassName={ADMIN_EYEBROW_CLASS}
    >
      <BirthdayCalendar birthdays={birthdayPeople} />
    </MiniAppShell>
  );
}
