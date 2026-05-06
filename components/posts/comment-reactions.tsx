import { togglePostCommentReactionAction } from "@/app/actions";
import { reactionOptions, ReactionSummary } from "@/lib/data/reactions";

export function CommentReactions({
  commentId,
  postSlug,
  summary
}: {
  commentId: string;
  postSlug: string;
  summary: ReactionSummary;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {reactionOptions.map((item) => {
        const active = summary.selectedReaction === item.key;
        const count = summary.counts[item.key] ?? 0;

        return (
          <form key={item.key} action={togglePostCommentReactionAction}>
            <input type="hidden" name="commentId" value={commentId} />
            <input type="hidden" name="postSlug" value={postSlug} />
            <input type="hidden" name="reaction" value={item.key} />
            <button
              type="submit"
              aria-label={`${item.label}: ${count}`}
              aria-pressed={active}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                active
                  ? "border-accent/40 bg-accent/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-accent/20 hover:text-white"
              }`}
            >
              <span>{item.emoji}</span>
              <span>{count}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
