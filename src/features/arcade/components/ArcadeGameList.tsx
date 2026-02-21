import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ARCADE_GAME_ICONS,
  type ArcadeGame,
} from "@/features/arcade/registry/arcadeGames";

export function ArcadeGameList({ games }: { games: ArcadeGame[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {games.map((game) => {
        const Icon = ARCADE_GAME_ICONS[game.id];
        return (
          <Link key={game.id} href={`/arcade/${game.id}`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/60">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="inline-flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {game.title}
                  </CardTitle>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${
                      game.supportsZkScoreProof
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {game.supportsZkScoreProof ? "ZK-ready" : "Arcade"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{game.description}</p>
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Click to launch
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
