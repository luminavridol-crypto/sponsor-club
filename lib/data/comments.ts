import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PostCommentWithAuthor } from "@/lib/types";

export async function getCommentsForPost(postId: string) {
  noStore();
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("post_comments")
    .select("*, profiles(display_name, nickname, email, role)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return (data ?? []) as PostCommentWithAuthor[];
}
