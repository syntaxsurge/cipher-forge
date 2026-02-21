import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

export const truncateAll = mutationGeneric({
  args: {
    secret: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.CONVEX_RESET_TOKEN;

    if (expectedSecret && args.secret !== expectedSecret) {
      throw new Error("Invalid reset secret.");
    }

    const batchSize = Math.max(1, Math.floor(args.batchSize ?? 128));

    let totalDeleted = 0;
    let cursor: string | null = null;

    while (true) {
      const page = await ctx.db
        .query("draftChallenges")
        .paginate({ cursor, numItems: batchSize });

      for (const challenge of page.page) {
        await ctx.db.delete(challenge._id);
      }

      totalDeleted += page.page.length;
      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    return {
      draftChallenges: totalDeleted,
    };
  },
});
