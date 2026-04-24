import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { csvResponse } from "@/lib/utils/csv";

export async function GET() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    nickname: user.nickname,
    role: user.role,
    tier: user.tier,
    access_status: user.access_status,
    access_expires_at: user.access_expires_at,
    total_donations: user.total_donations,
    birth_date: user.birth_date,
    telegram_contact: user.telegram_contact,
    tiktok_contact: user.tiktok_contact,
    admin_note: user.admin_note,
    created_at: user.created_at
  }));

  return csvResponse("lumina-users.csv", rows);
}
