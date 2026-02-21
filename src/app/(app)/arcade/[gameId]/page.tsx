import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ArcadeFrame } from "@/features/arcade/components/ArcadeFrame";
import {
  ARCADE_GAME_ICONS,
  getArcadeGame,
} from "@/features/arcade/registry/arcadeGames";

export default async function ArcadeGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = getArcadeGame(gameId);
  if (!game) {
    notFound();
  }
  const GameIcon = ARCADE_GAME_ICONS[game.id];

  return (
    <main className="relative mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold">
            <GameIcon className="h-6 w-6 text-primary" />
            {game.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {game.description}
          </p>
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Controls: keyboard + touch are supported. Use <code>P</code> or the
            in-game pause button to pause/resume.
          </p>
        </div>
        <Button asChild>
          <Link href="/forge?tab=create">
            <Swords className="h-4 w-4" />
            Create challenge with this game
          </Link>
        </Button>
      </div>

      <ArcadeFrame gameTitle={game.title} iframeSrc={game.iframeSrc} />
    </main>
  );
}
