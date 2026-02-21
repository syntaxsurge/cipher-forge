import Link from "next/link";
import { Compass, Gamepad2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ARCADE_GAMES,
  ARCADE_GAME_ICONS,
} from "@/features/arcade/registry/arcadeGames";
import { PublishedChallengesList } from "@/features/challenges/PublishedChallengesList";

export default function ExplorePage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Compass className="h-3.5 w-3.5" />
            Challenge Marketplace
          </p>
          <h1 className="text-3xl font-semibold">Explore Published Challenges</h1>
          <p className="text-sm text-muted-foreground">
            Choose a published arcade challenge, copy its link, and send it to challengers.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gamepad2 className="h-5 w-5 text-primary" />
              Available ZK Game Modes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {ARCADE_GAMES.map((mode) => {
              const Icon = ARCADE_GAME_ICONS[mode.id];
              return (
                <div key={mode.id} className="rounded-md border bg-muted/30 p-3">
                  <p className="inline-flex items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {mode.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{mode.description}</p>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/forge?tab=create">Create a new challenge</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/arcade">Browse arcade games</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <PublishedChallengesList />
      </div>
    </main>
  );
}
