import { makeFunctionReference } from "convex/server";

export type DraftChallenge = {
  _id: string;
  _creationTime: number;
  creatorAddress: string;
  title: string;
  description: string;
  challengeType: "secret_word";
  gamePreset: "pong" | "snake" | "asteroids";
  inputLabel: string;
  inputPlaceholder: string;
  inputPattern: string;
  hint?: string;
  expectedHashHex: string;
  status: "draft" | "published" | "settled";
  publishedAt?: number;
  sessionId?: number;
  challengerAddress?: string;
  submittedBy?: string;
  settledAt?: number;
  createdAt: number;
};

export const createSecretWordDraftChallengeRef = makeFunctionReference<
  "mutation",
  {
    title: string;
    description: string;
    hint?: string;
    expectedHashHex: string;
    gamePreset: "pong" | "snake" | "asteroids";
  },
  string
>("challenges:createSecretWordDraft");

export const publishDraftChallengeRef = makeFunctionReference<
  "mutation",
  { challengeId: string },
  string
>("challenges:publishDraft");

export const listDraftChallengesRef = makeFunctionReference<
  "query",
  Record<string, never>,
  DraftChallenge[]
>("challenges:listMyDrafts");

export const listPublishedChallengesRef = makeFunctionReference<
  "query",
  Record<string, never>,
  DraftChallenge[]
>("challenges:listPublishedChallenges");

export const getDraftChallengeByIdRef = makeFunctionReference<
  "query",
  { challengeId: string },
  DraftChallenge | null
>("challenges:getDraftById");

export const recordSessionStartRef = makeFunctionReference<
  "mutation",
  {
    challengeId: string;
    sessionId: number;
    challengerAddress: string;
  },
  string
>("challenges:recordSessionStart");

export const recordProofSettlementRef = makeFunctionReference<
  "mutation",
  {
    challengeId: string;
    sessionId: number;
    solverAddress: string;
  },
  string
>("challenges:recordProofSettlement");

export type LeaderboardEntry = {
  address: string;
  score: number;
};

export type ChallengeLeaderboard = {
  topCreators: LeaderboardEntry[];
  topSolvers: LeaderboardEntry[];
};

export const getChallengeLeaderboardRef = makeFunctionReference<
  "query",
  Record<string, never>,
  ChallengeLeaderboard
>("leaderboard:getLeaderboard");
