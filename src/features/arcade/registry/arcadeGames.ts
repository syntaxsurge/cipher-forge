import type { LucideIcon } from "lucide-react";
import { Rocket, Target, Zap } from "lucide-react";

export type ArcadeGameId = "pong" | "snake" | "asteroids";

export type ArcadeGame = {
  id: ArcadeGameId;
  title: string;
  description: string;
  iframeSrc: string;
  supportsZkScoreProof: boolean;
};

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: "pong",
    title: "Pong Duel",
    description: "Classic arcade rally with fast-paced paddle combat.",
    iframeSrc: "/games/pong/index.html",
    supportsZkScoreProof: true,
  },
  {
    id: "snake",
    title: "Snake Run",
    description: "Survive and grow while chasing a top score run.",
    iframeSrc: "/games/snake/index.html",
    supportsZkScoreProof: true,
  },
  {
    id: "asteroids",
    title: "Asteroids",
    description: "Arcade space survival with escalating pressure and score.",
    iframeSrc: "/games/asteroids/index.html",
    supportsZkScoreProof: true,
  },
];

export function getArcadeGame(id: string): ArcadeGame | null {
  return ARCADE_GAMES.find((game) => game.id === id) ?? null;
}

export const ARCADE_GAME_ICONS: Record<ArcadeGameId, LucideIcon> = {
  pong: Target,
  snake: Zap,
  asteroids: Rocket,
};
