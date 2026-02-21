import Link from "next/link";
import { ArrowRight, Compass, Gamepad2, Sparkles, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const flowSteps = [
  {
    title: "1. Create challenge draft",
    description:
      "Choose an arcade game preset, enter a private victory code, and store a commitment hash draft.",
  },
  {
    title: "2. Publish and share",
    description:
      "Publish from Forge. Your challenge becomes visible in Explore and can be shared by link.",
  },
  {
    title: "3. Challenger proves",
    description:
      "A challenger opens the challenge link, plays the arcade game, and generates a local Noir proof in-browser.",
  },
  {
    title: "4. On-chain settlement",
    description:
      "Challenger starts session, submits proof, and the game settles through Soroban contracts.",
  },
];

const gameModes = [
  {
    title: "Pong Duel",
    detail: "Fast 2D paddle match",
  },
  {
    title: "Snake Run",
    detail: "Score-chase survival",
  },
  {
    title: "Asteroids",
    detail: "Arcade space survival",
  },
];

export default function HomePage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 py-12 sm:px-6">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> ZK Gaming on Stellar
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            CipherForge
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            A creator-first game hub where challenge outcomes are settled with
            zero-knowledge proofs instead of trust.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/forge">
                <Swords className="h-4 w-4" /> Open Forge
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/explore">
                <Compass className="h-4 w-4" /> Explore Challenges
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/arcade">
                <Gamepad2 className="h-4 w-4" /> Open Arcade
              </Link>
            </Button>
          </div>
        </div>

        <Card className="border-primary/25 bg-gradient-to-br from-background via-background to-primary/10 shadow-lg">
          <CardHeader>
            <CardTitle>Why It Feels Like a Real Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Creator-owned challenges with clear publish/share lifecycle.</p>
            <p>Draft commitments first, then full proof generation in solve flow.</p>
            <p>Proof generation and on-chain settlement shown in one flow.</p>
            <p>Judge mode with direct contract explorer verification links.</p>
          </CardContent>
        </Card>
      </section>

      <section id="how-it-works" className="mt-12 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">How It Works</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/judge">
              Open Judge Mode <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {flowSteps.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold">Playable ZK Modes</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {gameModes.map((mode) => (
            <Card key={mode.title}>
              <CardHeader>
                <CardTitle className="text-base">{mode.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mode.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
