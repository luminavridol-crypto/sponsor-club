import { requireAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { csvResponse } from "@/lib/utils/csv";

export async function GET() {
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("purchase_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data ?? []).map((request) => ({
    id: request.id,
    tier: request.tier,
    display_name: request.display_name,
    email: request.email,
    country: request.country,
    contact: request.contact,
    status: request.status,
    created_at: request.created_at,
    updated_at: request.updated_at
  }));

  return csvResponse("lumina-requests.csv", rows);
}
