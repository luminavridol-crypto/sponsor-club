import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PostReactionType } from "@/lib/types";

export const reactionOptions: {
  key: PostReactionType;
  emoji: string;
  label: string;
}[] = [
  { key: "heart", emoji: "❤️", label: "Нравится" },
  { key: "fire", emoji: "🔥", label: "Огонь" },
  { key: "cry", emoji: "😭", label: "До слёз" },
  { key: "sparkles", emoji: "✨", label: "Вау" },
  { key: "devil", emoji: "😈", label: "Дерзко" }
];

export type ReactionSummary = {
  counts: Record<PostReactionType, number>;
  selectedReaction: PostReactionType | null;
};

export function createEmptyReactionCounts() {
  return Object.fromEntries(reactionOptions.map((item) => [item.key, 0])) as Record<
    PostReactionType,
    number
  >;
}

export async function getReactionSummariesForPosts(postIds: string[], profileId: string) {
  noStore();

  const summaries = new Map<string, ReactionSummary>();

  for (const postId of postIds) {
    summaries.set(postId, {
      counts: createEmptyReactionCounts(),
      selectedReaction: null
    });
  }

  if (!postIds.length) {
    return summaries;
  }

  const admin = createAdminSupabaseClient();
  const [{ data: reactions }, { data: ownReactions }] = await Promise.all([
    admin.from("post_reactions").select("post_id, reaction").in("post_id", postIds),
    admin
      .from("post_reactions")
      .select("post_id, reaction")
      .eq("profile_id", profileId)
      .in("post_id", postIds)
  ]);

  for (const reaction of reactions ?? []) {
    const postId = String(reaction.post_id);
    const reactionKey = reaction.reaction as PostReactionType;
    const summary = summaries.get(postId);

    if (summary && reactionKey in summary.counts) {
      summary.counts[reactionKey] += 1;
    }
  }

  for (const reaction of ownReactions ?? []) {
    const postId = String(reaction.post_id);
    const summary = summaries.get(postId);

    if (summary) {
      summary.selectedReaction = reaction.reaction as PostReactionType;
    }
  }

  return summaries;
}

export async function getReactionSummaryForPost(postId: string, profileId: string) {
  const summaries = await getReactionSummariesForPosts([postId], profileId);
  return (
    summaries.get(postId) ?? {
      counts: createEmptyReactionCounts(),
      selectedReaction: null
    }
  );
}
