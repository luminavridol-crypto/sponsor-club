import { togglePostReactionAction } from "@/app/actions";
import { reactionOptions, ReactionSummary } from "@/lib/data/reactions";

export function PostReactions({
  postId,
  postSlug,
  summary
}: {
  postId: string;
  postSlug: string;
  summary: ReactionSummary;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {reactionOptions.map((item) => {
        const active = summary.selectedReaction === item.key;
        const count = summary.counts[item.key] ?? 0;

        return (
          <form key={item.key} action={togglePostReactionAction}>
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="postSlug" value={postSlug} />
            <input type="hidden" name="reaction" value={item.key} />
            <button
              type="submit"
              aria-label={`${item.label}: ${count}`}
              aria-pressed={active}
              title={item.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                active
                  ? "border-accent/40 bg-accent/15 text-white"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:border-accent/25 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{item.emoji}</span>
              <span>{count}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
