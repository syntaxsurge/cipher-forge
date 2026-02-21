"use client";

import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import {
  listDraftChallengesRef,
  publishDraftChallengeRef,
  type DraftChallenge,
} from "@/lib/convex/function-references";
import { ARCADE_GAME_ICONS } from "@/features/arcade/registry/arcadeGames";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCipherForgeAuth } from "@/features/auth/CipherForgeAuthProvider";

const presetNames: Record<DraftChallenge["gamePreset"], string> = {
  pong: "Pong Duel",
  snake: "Snake Run",
  asteroids: "Asteroids",
};

function statusStyle(status: DraftChallenge["status"]) {
  if (status === "published") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
  }

  if (status === "settled") {
    return "border-sky-500/40 bg-sky-500/10 text-sky-600";
  }

  return "border-amber-500/40 bg-amber-500/10 text-amber-600";
}

export function DraftChallengesList() {
  const { isAuthenticated: isAppAuthenticated } = useCipherForgeAuth();
  const publishDraft = useMutation(publishDraftChallengeRef);
  const {
    isAuthenticated: isConvexAuthenticated,
    isLoading: isConvexAuthLoading,
  } = useConvexAuth();
  const shouldLoadDrafts =
    isAppAuthenticated && isConvexAuthenticated && !isConvexAuthLoading;
  const drafts = useQuery(listDraftChallengesRef, shouldLoadDrafts ? {} : "skip");

  async function handlePublish(challengeId: string) {
    try {
      await publishDraft({ challengeId });
      toast.success("Challenge published. It is now visible on Explore.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish challenge.",
      );
    }
  }

  async function handleCopyShare(challengeId: string) {
    try {
      const shareUrl = `${window.location.origin}/forge/${challengeId}/prove`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Challenge link copied.");
    } catch {
      toast.error("Failed to copy challenge link.");
    }
  }

  if (!isAppAuthenticated) {
    return (
      <EmptyState
        title="Authenticate to view drafts"
        description="SEP-10 authentication is required to load challenge drafts tied to your creator identity."
      />
    );
  }

  if (isConvexAuthLoading) {
    return (
      <EmptyState
        title="Syncing secure session"
        description="Finalizing authenticated access to your Convex data."
      />
    );
  }

  if (!isConvexAuthenticated) {
    return (
      <EmptyState
        title="Session not ready"
        description="Your wallet is connected, but authenticated data access is not active yet. Sign out and sign in again if this persists."
      />
    );
  }

  if (!drafts) {
    return (
      <EmptyState
        title="Loading drafts"
        description="Fetching your challenge drafts from Convex."
      />
    );
  }

  if (drafts.length === 0) {
    return (
      <EmptyState
        title="No drafts yet"
        description="Create and publish your first challenge from the Create tab."
      />
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <DraftCard
          key={draft._id}
          draft={draft}
          onPublish={handlePublish}
          onCopyShare={handleCopyShare}
        />
      ))}
    </div>
  );
}

function DraftCard({
  draft,
  onPublish,
  onCopyShare,
}: {
  draft: DraftChallenge;
  onPublish: (challengeId: string) => Promise<void>;
  onCopyShare: (challengeId: string) => Promise<void>;
}) {
  const Icon = ARCADE_GAME_ICONS[draft.gamePreset];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="max-w-full break-words text-balance">
            {draft.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {presetNames[draft.gamePreset]}
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${statusStyle(
                draft.status,
              )}`}
            >
              {draft.status}
            </span>
          </div>
        </div>
        <CardDescription>{new Date(draft.createdAt).toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft.description ? (
          <p className="break-words text-sm text-muted-foreground">
            {draft.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No description provided.</p>
        )}

        <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
          Commitment hash: {draft.expectedHashHex}
        </p>
        <p className="text-xs text-muted-foreground">
          Drafts store the commitment hash only. ZK proof is generated on the
          challenge prove page.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={`/forge/${draft._id}/prove`}>Open challenge</Link>
          </Button>
          {draft.status === "draft" ? (
            <Button onClick={() => void onPublish(draft._id)}>Publish challenge</Button>
          ) : null}
          {draft.status !== "draft" ? (
            <Button
              variant="secondary"
              onClick={() => void onCopyShare(draft._id)}
            >
              <Share2 className="h-4 w-4" />
              Copy share link
            </Button>
          ) : null}
        </div>

        {draft.sessionId ? (
          <p className="text-xs text-muted-foreground">
            Session: {draft.sessionId}
            {draft.submittedBy ? ` · Solver: ${draft.submittedBy}` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
