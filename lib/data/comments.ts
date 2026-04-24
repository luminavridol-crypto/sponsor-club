import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PostCommentWithAuthor } from "@/lib/types";

export type AdminPostCommentNotice = PostCommentWithAuthor & {
  posts: {
    title: string;
    slug: string;
  } | null;
};

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

export async function getAdminUnreadPostComments(lastSeenAt: string | null) {
  noStore();
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("post_comments")
    .select("*, profiles(display_name, nickname, email, role), posts(title, slug)")
    .order("created_at", { ascending: false })
    .limit(10);

  if (lastSeenAt) {
    query = query.gt("created_at", lastSeenAt);
  }

  const { data } = await query;

  return (data ?? []) as AdminPostCommentNotice[];
}

export async function getAdminLatestPostCommentAt() {
  noStore();
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("post_comments")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.created_at ?? null;
}
