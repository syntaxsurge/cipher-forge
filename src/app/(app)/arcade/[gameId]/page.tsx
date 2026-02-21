import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ArcadeFrame } from "@/features/arcade/components/ArcadeFrame";
import { getArcadeGame } from "@/features/arcade/registry/arcadeGames";

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

  return (
    <main className="relative mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{game.title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {game.description}
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
