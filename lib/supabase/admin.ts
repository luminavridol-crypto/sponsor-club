import { createClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseEnv } from "@/lib/supabase/env";

export function createAdminSupabaseClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = getServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
