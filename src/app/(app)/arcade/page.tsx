import { Gamepad2 } from "lucide-react";

import { ArcadeGameList } from "@/features/arcade/components/ArcadeGameList";
import { ARCADE_GAMES } from "@/features/arcade/registry/arcadeGames";

export default function ArcadeIndexPage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Gamepad2 className="h-3.5 w-3.5" />
            Arcade Game Pack
          </p>
          <h1 className="text-3xl font-semibold">Choose a Game</h1>
          <p className="text-sm text-muted-foreground">
            CipherForge runs production game presets sourced from external open-source
            arcade repositories and hosted under <code>/public/games</code>.
          </p>
        </div>

        <ArcadeGameList games={ARCADE_GAMES} />
      </div>
    </main>
  );
}

