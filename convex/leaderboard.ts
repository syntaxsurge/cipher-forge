import { queryGeneric } from "convex/server";

type LeaderboardEntry = {
  address: string;
  score: number;
};

function topEntries(entries: Map<string, number>, limit: number) {
  return [...entries.entries()]
    .map(([address, score]) => ({ address, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const getLeaderboard = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const challenges = await ctx.db.query("draftChallenges").collect();

    const creators = new Map<string, number>();
    const solvers = new Map<string, number>();

    for (const challenge of challenges) {
      if (challenge.status === "published" || challenge.status === "settled") {
        creators.set(
          challenge.creatorAddress,
          (creators.get(challenge.creatorAddress) ?? 0) + 1,
        );
      }

      if (challenge.status === "settled" && challenge.submittedBy) {
        solvers.set(
          challenge.submittedBy,
          (solvers.get(challenge.submittedBy) ?? 0) + 1,
        );
      }
    }

    return {
      topCreators: topEntries(creators, 10) as LeaderboardEntry[],
      topSolvers: topEntries(solvers, 10) as LeaderboardEntry[],
    };
  },
});
