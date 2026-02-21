"use client";

import { useQuery } from "convex/react";
import { Flame, Medal, Trophy } from "lucide-react";

import {
  getChallengeLeaderboardRef,
  type LeaderboardEntry,
} from "@/lib/convex/function-references";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function compactAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function LeaderboardColumn({
  title,
  icon,
  rows,
  suffix,
}: {
  title: string;
  icon: React.ReactNode;
  rows: LeaderboardEntry[];
  suffix: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No settled challenge data yet.
          </p>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.address}-${index}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                #{index + 1} {compactAddress(row.address)}
              </span>
              <span className="font-medium">
                {row.score} {suffix}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function LeaderboardPage() {
  const leaderboard = useQuery(getChallengeLeaderboardRef, {});

  return (
    <main className="relative mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" />
            Reputation
          </p>
          <h1 className="text-3xl font-semibold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Rankings based on published and settled challenge activity.
          </p>
        </div>

        {!leaderboard ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading leaderboard</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <LeaderboardColumn
              title="Top Creators"
              icon={<Flame className="h-5 w-5 text-primary" />}
              rows={leaderboard.topCreators}
              suffix="challenges"
            />
            <LeaderboardColumn
              title="Top Solvers"
              icon={<Medal className="h-5 w-5 text-primary" />}
              rows={leaderboard.topSolvers}
              suffix="solves"
            />
          </div>
        )}
      </div>
    </main>
  );
}
