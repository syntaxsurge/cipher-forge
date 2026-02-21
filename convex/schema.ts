import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  draftChallenges: defineTable({
    creatorAddress: v.string(),
    title: v.string(),
    description: v.string(),
    challengeType: v.union(v.literal("standard"), v.literal("secret_word")),
    gamePreset: v.optional(
      v.union(
        v.literal("pong"),
        v.literal("snake"),
        v.literal("asteroids"),
      ),
    ),
    inputLabel: v.optional(v.string()),
    inputPlaceholder: v.optional(v.string()),
    inputPattern: v.optional(v.string()),
    hint: v.optional(v.string()),
    expectedHashHex: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("settled")),
    ),
    publishedAt: v.optional(v.number()),
    sessionId: v.optional(v.number()),
    challengerAddress: v.optional(v.string()),
    submittedBy: v.optional(v.string()),
    settledAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_creator", ["creatorAddress"])
    .index("by_status", ["status"])
    .index("by_creator_status", ["creatorAddress", "status"]),
});
