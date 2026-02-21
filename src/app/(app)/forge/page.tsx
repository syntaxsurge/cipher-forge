"use client";

import { ShieldCheck, Swords } from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCipherForgeAuth } from "@/features/auth/CipherForgeAuthProvider";
import { CreateDraftChallengeForm } from "@/features/challenges/CreateDraftChallengeForm";
import { DraftChallengesList } from "@/features/challenges/DraftChallengesList";

export default function ForgePage() {
  const { isAuthenticated } = useCipherForgeAuth();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "create" ? "create" : "drafts";

  return (
    <main className="relative mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6">
      <Card className="mb-6 border-primary/25 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Swords className="h-6 w-6 text-primary" />
            Creator Forge
          </CardTitle>
          <CardDescription>
            Create arcade challenge drafts, publish/share them, and settle sessions
            through the on-chain CipherForge contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Wallet connection, authentication, and account controls are in the top
            header menu.
          </div>
          <ol className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <li className="rounded-md border bg-muted/30 px-3 py-2">
              1. Pick one arcade game preset and create a challenge draft.
            </li>
            <li className="rounded-md border bg-muted/30 px-3 py-2">
              2. Publish from My Drafts and copy the challenge link.
            </li>
            <li className="rounded-md border bg-muted/30 px-3 py-2">
              3. Open the link with another wallet to play and submit proof.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="drafts">My Drafts</TabsTrigger>
          <TabsTrigger value="create">Create Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts">
          <DraftChallengesList />
        </TabsContent>

        <TabsContent value="create">
          <Card className={!isAuthenticated ? "opacity-80" : undefined}>
            <CardHeader>
              <CardTitle>Draft a Challenge</CardTitle>
              <CardDescription>
                Choose an arcade game preset, set the challenge key commitment,
                then publish from the Drafts tab so it appears on Explore.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <CreateDraftChallengeForm />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Authenticate with SEP-10 to create challenge drafts.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
