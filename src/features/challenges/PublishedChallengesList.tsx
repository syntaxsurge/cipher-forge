"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import {
  listPublishedChallengesRef,
  type DraftChallenge,
} from "@/lib/convex/function-references";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const presetNames: Record<DraftChallenge["gamePreset"], string> = {
  pong: "Pong Duel",
  snake: "Snake Run",
  asteroids: "Asteroids",
};

export function PublishedChallengesList() {
  const challenges = useQuery(listPublishedChallengesRef, {});

  async function handleCopy(challengeId: string) {
    try {
      const shareUrl = `${window.location.origin}/forge/${challengeId}/prove`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Challenge link copied.");
    } catch {
      toast.error("Failed to copy challenge link.");
    }
  }

  if (!challenges) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading published challenges</CardTitle>
          <CardDescription>Fetching creator-published challenge list.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (challenges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No published challenges yet</CardTitle>
          <CardDescription>
            Publish at least one draft from Forge to make it discoverable here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((challenge) => (
        <Card key={challenge._id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="max-w-full break-words text-balance">
                {challenge.title}
              </CardTitle>
              <span className="rounded-full border px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                {presetNames[challenge.gamePreset]}
              </span>
            </div>
            <CardDescription>
              Published {new Date(challenge.publishedAt ?? challenge.createdAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="break-words text-sm text-muted-foreground">
              {challenge.description}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/forge/${challenge._id}/prove`}>Play challenge</Link>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleCopy(challenge._id)}
              >
                <Share2 className="h-4 w-4" />
                Copy link
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
