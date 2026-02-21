"use client";

import { useParams } from "next/navigation";

import { SecretWordProofWorkbench } from "@/features/challenges/SecretWordProofWorkbench";

export default function SecretWordProofPage() {
  const params = useParams<{ challengeId: string }>();
  const challengeId = params?.challengeId;

  if (!challengeId) {
    return (
      <main className="relative mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
        Loading challenge...
      </main>
    );
  }

  return <SecretWordProofWorkbench challengeId={challengeId} />;
}
