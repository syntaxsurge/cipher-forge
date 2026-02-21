import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const gamePresetSchema = v.union(
  v.literal("pong"),
  v.literal("snake"),
  v.literal("asteroids"),
);

const inputRules = {
  pong: {
    inputLabel: "Victory code",
    inputPlaceholder: "Enter a private victory code (1-16 printable chars)",
    inputPattern: "^[\\x20-\\x7E]{1,16}$",
  },
  snake: {
    inputLabel: "Victory code",
    inputPlaceholder: "Enter a private victory code (1-16 printable chars)",
    inputPattern: "^[\\x20-\\x7E]{1,16}$",
  },
  asteroids: {
    inputLabel: "Victory code",
    inputPlaceholder: "Enter a private victory code (1-16 printable chars)",
    inputPattern: "^[\\x20-\\x7E]{1,16}$",
  },
} as const;

type GamePreset = keyof typeof inputRules;
type StoredGamePreset = GamePreset | "word_cipher";
type LifecycleStatus = "draft" | "published" | "settled";

function fallbackPresetFromLegacyTitle(title: string): GamePreset {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("snake")) {
    return "snake";
  }
  if (normalizedTitle.includes("asteroid")) {
    return "asteroids";
  }
  return "pong";
}

function normalizeStoredGamePreset(
  gamePreset: StoredGamePreset | undefined,
  title: string,
): GamePreset {
  if (!gamePreset || gamePreset === "word_cipher") {
    return fallbackPresetFromLegacyTitle(title);
  }

  return gamePreset;
}

function normalizeLegacyInputLabel(
  inputLabel: string | undefined,
  fallbackLabel: string,
) {
  if (!inputLabel || inputLabel.trim().length === 0) {
    return fallbackLabel;
  }

  const normalized = inputLabel.trim().toLowerCase();
  if (normalized === "challenge key") {
    return fallbackLabel;
  }

  return inputLabel;
}

function normalizeLegacyInputPlaceholder(
  inputPlaceholder: string | undefined,
  fallbackPlaceholder: string,
) {
  if (!inputPlaceholder || inputPlaceholder.trim().length === 0) {
    return fallbackPlaceholder;
  }

  const normalized = inputPlaceholder.trim().toLowerCase();
  if (normalized === "enter a challenge key (1-16 printable chars)") {
    return fallbackPlaceholder;
  }

  return inputPlaceholder;
}

function normalizeSecretChallenge(challenge: {
  _id: unknown;
  _creationTime: number;
  creatorAddress: string;
  title: string;
  description: string;
  challengeType: "standard" | "secret_word";
  gamePreset?: StoredGamePreset;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputPattern?: string;
  expectedHashHex?: string;
  status?: LifecycleStatus;
  publishedAt?: number;
  sessionId?: number;
  challengerAddress?: string;
  submittedBy?: string;
  settledAt?: number;
  createdAt: number;
}) {
  if (challenge.challengeType !== "secret_word" || !challenge.expectedHashHex) {
    return null;
  }

  const gamePreset = normalizeStoredGamePreset(
    challenge.gamePreset,
    challenge.title,
  );
  const rules = inputRules[gamePreset];

  return {
    _id: challenge._id,
    _creationTime: challenge._creationTime,
    creatorAddress: challenge.creatorAddress,
    title: challenge.title,
    description: challenge.description,
    challengeType: "secret_word" as const,
    gamePreset,
    inputLabel: normalizeLegacyInputLabel(challenge.inputLabel, rules.inputLabel),
    inputPlaceholder: normalizeLegacyInputPlaceholder(
      challenge.inputPlaceholder,
      rules.inputPlaceholder,
    ),
    inputPattern: challenge.inputPattern ?? rules.inputPattern,
    expectedHashHex: challenge.expectedHashHex,
    status: challenge.status ?? "draft",
    publishedAt: challenge.publishedAt,
    sessionId: challenge.sessionId,
    challengerAddress: challenge.challengerAddress,
    submittedBy: challenge.submittedBy,
    settledAt: challenge.settledAt,
    createdAt: challenge.createdAt,
  };
}

function ensureValidHash(hash: string) {
  const normalizedHash = hash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(normalizedHash)) {
    throw new Error("expectedHashHex must be a 32-byte lowercase hex string.");
  }
  return normalizedHash;
}

export const createSecretWordDraft = mutationGeneric({
  args: {
    title: v.string(),
    description: v.string(),
    expectedHashHex: v.string(),
    gamePreset: gamePresetSchema,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const presetRules = inputRules[args.gamePreset];

    return await ctx.db.insert("draftChallenges", {
      creatorAddress: identity.subject,
      title: args.title.trim(),
      description: args.description.trim(),
      challengeType: "secret_word",
      gamePreset: args.gamePreset,
      inputLabel: presetRules.inputLabel,
      inputPlaceholder: presetRules.inputPlaceholder,
      inputPattern: presetRules.inputPattern,
      expectedHashHex: ensureValidHash(args.expectedHashHex),
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

export const publishDraft = mutationGeneric({
  args: {
    challengeId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const normalizedChallengeId = ctx.db.normalizeId(
      "draftChallenges",
      args.challengeId,
    );

    if (!normalizedChallengeId) {
      throw new Error("Challenge not found.");
    }

    const challenge = await ctx.db.get(normalizedChallengeId);
    if (!challenge) {
      throw new Error("Challenge not found.");
    }

    if (challenge.creatorAddress !== identity.subject) {
      throw new Error("Only the creator can publish this challenge.");
    }

    if (challenge.challengeType !== "secret_word" || !challenge.expectedHashHex) {
      throw new Error("Only secret-word ZK challenges can be published.");
    }

    if ((challenge.status ?? "draft") !== "draft") {
      return challenge._id;
    }

    await ctx.db.patch(challenge._id, {
      status: "published",
      gamePreset: normalizeStoredGamePreset(challenge.gamePreset, challenge.title),
      publishedAt: Date.now(),
    });

    return challenge._id;
  },
});

export const listMyDrafts = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const challenges = await ctx.db
      .query("draftChallenges")
      .withIndex("by_creator", (q) => q.eq("creatorAddress", identity.subject))
      .order("desc")
      .collect();

    return challenges
      .map((challenge) => normalizeSecretChallenge(challenge))
      .filter(
        (challenge): challenge is NonNullable<typeof challenge> =>
          challenge !== null,
      );
  },
});

export const listPublishedChallenges = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const allChallenges = await ctx.db.query("draftChallenges").collect();
    const nonDraftChallenges = allChallenges
      .map((challenge) => normalizeSecretChallenge(challenge))
      .filter(
        (challenge): challenge is NonNullable<typeof challenge> =>
          challenge !== null && challenge.status !== "draft",
      );

    return nonDraftChallenges.sort(
      (a, b) =>
        (b.publishedAt ?? b.createdAt ?? 0) - (a.publishedAt ?? a.createdAt ?? 0),
    );
  },
});

export const getDraftById = queryGeneric({
  args: {
    challengeId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedChallengeId = ctx.db.normalizeId(
      "draftChallenges",
      args.challengeId,
    );

    if (!normalizedChallengeId) {
      return null;
    }

    const challenge = await ctx.db.get(normalizedChallengeId);
    if (!challenge) {
      return null;
    }

    return normalizeSecretChallenge(challenge);
  },
});

export const recordSessionStart = mutationGeneric({
  args: {
    challengeId: v.string(),
    sessionId: v.number(),
    challengerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedChallengeId = ctx.db.normalizeId(
      "draftChallenges",
      args.challengeId,
    );

    if (!normalizedChallengeId) {
      throw new Error("Challenge not found.");
    }

    const challenge = await ctx.db.get(normalizedChallengeId);
    if (!challenge) {
      throw new Error("Challenge not found.");
    }

    await ctx.db.patch(challenge._id, {
      sessionId: Math.floor(args.sessionId),
      challengerAddress: args.challengerAddress.trim(),
    });

    return challenge._id;
  },
});

export const recordProofSettlement = mutationGeneric({
  args: {
    challengeId: v.string(),
    sessionId: v.number(),
    solverAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedChallengeId = ctx.db.normalizeId(
      "draftChallenges",
      args.challengeId,
    );

    if (!normalizedChallengeId) {
      throw new Error("Challenge not found.");
    }

    const challenge = await ctx.db.get(normalizedChallengeId);
    if (!challenge) {
      throw new Error("Challenge not found.");
    }

    await ctx.db.patch(challenge._id, {
      status: "settled",
      sessionId: Math.floor(args.sessionId),
      submittedBy: args.solverAddress.trim(),
      settledAt: Date.now(),
    });

    return challenge._id;
  },
});
