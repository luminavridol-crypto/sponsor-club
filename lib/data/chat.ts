import { unstable_noStore as noStore } from "next/cache";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MemberChatMessage } from "@/lib/types";

export function getChatCutoffIso(days = 30) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function cleanupOldChatMessages(admin: SupabaseClient, days = 30) {
  const cutoffIso = getChatCutoffIso(days);
  const { data: staleMessages } = await admin
    .from("member_chat_messages")
    .select("media_path")
    .lt("created_at", cutoffIso)
    .not("media_path", "is", null);

  const stalePaths = (staleMessages ?? [])
    .map((message) => message.media_path)
    .filter((value): value is string => Boolean(value));

  if (stalePaths.length) {
    await admin.storage.from("chat-media").remove(stalePaths);
  }

  await admin
    .from("member_chat_messages")
    .delete()
    .lt("created_at", cutoffIso);
}

export async function getRecentChatMessages(admin: SupabaseClient, profileId: string) {
  const { data } = await admin
    .from("member_chat_messages")
    .select("*")
    .eq("profile_id", profileId)
    .gte("created_at", getChatCutoffIso())
    .order("created_at", { ascending: true });

  return (data ?? []) as MemberChatMessage[];
}

export async function markChatReadByAdmin(admin: SupabaseClient, profileId: string) {
  await admin
    .from("member_chat_messages")
    .update({ read_by_admin_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("sender_role", "member")
    .is("read_by_admin_at", null)
    .gte("created_at", getChatCutoffIso());
}

export async function markChatReadByMember(admin: SupabaseClient, profileId: string) {
  await admin
    .from("member_chat_messages")
    .update({ read_by_member_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("sender_role", "admin")
    .is("read_by_member_at", null)
    .gte("created_at", getChatCutoffIso());
}

export async function getAdminUnreadChatProfileIds(admin: SupabaseClient) {
  const { data } = await admin
    .from("member_chat_messages")
    .select("profile_id")
    .eq("sender_role", "member")
    .is("read_by_admin_at", null)
    .gte("created_at", getChatCutoffIso());

  return [...new Set((data ?? []).map((item) => item.profile_id).filter(Boolean))];
}

export async function hasUnreadMemberChat(admin: SupabaseClient, profileId: string) {
  const { data } = await admin
    .from("member_chat_messages")
    .select("id")
    .eq("profile_id", profileId)
    .eq("sender_role", "admin")
    .is("read_by_member_at", null)
    .gte("created_at", getChatCutoffIso())
    .limit(1);

  return Boolean(data?.length);
}

export async function getSignedChatMediaUrls(paths: string[]) {
  noStore();

  if (!paths.length) {
    return {};
  }

  const { data } = await createAdminSupabaseClient()
    .storage
    .from("chat-media")
    .createSignedUrls(paths, 60 * 60);

  return Object.fromEntries(
    (data ?? []).map((item) => [item.path, item.signedUrl ?? ""])
  );
}
