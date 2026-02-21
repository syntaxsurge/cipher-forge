"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Clipboard,
  Gamepad2,
  Loader2,
  ShieldAlert,
  Swords,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getDraftChallengeByIdRef,
} from "@/lib/convex/function-references";
import { OnchainSubmitPanel } from "@/features/challenges/OnchainSubmitPanel";
import { ArcadeFrame } from "@/features/arcade/components/ArcadeFrame";
import { getArcadeGame } from "@/features/arcade/registry/arcadeGames";
import { useWallet } from "@/features/wallet/WalletProvider";
import { areSameStellarAddress } from "@/lib/stellar/address";
import {
  hashSecretWord,
  prepareSecretWordProofInput,
} from "@/features/zk/services/secretWordHash";
import {
  checkSecretWordRuntimeAssets,
  getSecretWordProverApi,
  getSecretWordRuntimeAssetPaths,
  resetSecretWordProverApi,
} from "@/features/zk/services/secretWordProverClient";

type RuntimeStatus = "checking" | "ready" | "missing";
type ProverStatus = "idle" | "warming" | "ready" | "degraded";
const PROVER_WARMUP_TIMEOUT_MS = 180_000;
const PROOF_TIMEOUT_MS = 180_000;
const PROOF_UI_GUARD_MS = 190_000;
const PROVER_WARMUP_RETRY_LIMIT = 2;
const MAX_LOCAL_ATTEMPTS = 12;
const SESSION_WINDOW_SECONDS = 10 * 60;

type GuessAttempt = {
  id: number;
  digest: string;
  matched: boolean;
  createdAt: number;
};

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      onTimeout();
      reject(
        new Error(
          "Proof generation timed out. Retry once; if it keeps happening, run pnpm zk:build and restart dev server.",
        ),
      );
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function toFriendlyProofError(rawMessage: string) {
  const message = rawMessage.toLowerCase();

  if (
    message.includes("incorrect secret input") ||
    message.includes("assertion failed") ||
    message.includes("unsatisfied") ||
    message.includes("cannot satisfy constraint")
  ) {
    return "Incorrect victory code. Check the hint and required format, then try again.";
  }

  if (
    message.includes("version mismatch") ||
    message.includes("deserialize circuit") ||
    message.includes("incompatible with runtime")
  ) {
    return "ZK runtime mismatch detected. Run pnpm zk:build, restart the dev server, and reload this page.";
  }

  if (message.includes("assets are missing") || message.includes("failed to load /zk/")) {
    return "ZK runtime assets are missing. Run pnpm zk:build and reload this page.";
  }

  if (message.includes("timed out")) {
    return "Proof generation timed out. Retry once; if it keeps happening, run pnpm zk:build and restart dev server.";
  }

  if (
    message.includes("local verifier rejected generated proof") ||
    message.includes("verification failed after proof generation")
  ) {
    return "Proof generation runtime is inconsistent on this browser session. Run pnpm zk:build, restart the dev server, then hard-refresh this page.";
  }

  if (message.includes("did not finish in time")) {
    return "Proof generation did not finish in time. Retry once; if it keeps happening, refresh the page and retry.";
  }

  if (message.includes("failed to initialize proving runtime")) {
    return "ZK proving runtime failed to initialize. Check your network, then run pnpm zk:build and restart dev server.";
  }

  return rawMessage;
}

function normalizeInputByPreset(
  rawValue: string,
  preset: "pong" | "snake" | "asteroids",
) {
  void preset;
  return rawValue.trim();
}

function formatCountdown(secondsLeft: number) {
  const clamped = Math.max(0, secondsLeft);
  const minutes = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const message = Reflect.get(error, "message");
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }

    const cause = Reflect.get(error, "cause");
    if (typeof cause === "string" && cause.trim().length > 0) {
      return cause;
    }
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") {
      return serialized;
    }
  } catch {
    // ignore
  }

  return fallback;
}

export function SecretWordProofWorkbench({
  challengeId,
}: {
  challengeId: string;
}) {
  const challenge = useQuery(getDraftChallengeByIdRef, { challengeId });
  const { address: connectedAddress } = useWallet();

  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>("checking");
  const [missingAssets, setMissingAssets] = useState<string[]>([]);
  const [secretWord, setSecretWord] = useState("");
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [proofBytesBase64, setProofBytesBase64] = useState<string | null>(null);
  const [verificationKeyBase64, setVerificationKeyBase64] = useState<
    string | null
  >(null);
  const [publicInputs, setPublicInputs] = useState<string[]>([]);
  const [publicInputsBytesBase64, setPublicInputsBytesBase64] = useState<
    string | null
  >(null);
  const [isValidProof, setIsValidProof] = useState<boolean | null>(null);
  const [proofErrorMessage, setProofErrorMessage] = useState<string | null>(null);
  const [proofTechnicalMessage, setProofTechnicalMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proverStatus, setProverStatus] = useState<ProverStatus>("idle");
  const [guessAttempts, setGuessAttempts] = useState<GuessAttempt[]>([]);
  const [isLocalGuessMatched, setIsLocalGuessMatched] = useState<boolean | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;

    async function checkAssets() {
      try {
        const checks = await checkSecretWordRuntimeAssets();
        if (!isMounted) {
          return;
        }

        const missing = checks.filter((item) => !item.ok).map((item) => item.path);
        setMissingAssets(missing);
        setRuntimeStatus(missing.length > 0 ? "missing" : "ready");
      } catch {
        if (!isMounted) {
          return;
        }
        setMissingAssets(getSecretWordRuntimeAssetPaths());
        setRuntimeStatus("missing");
      }
    }

    void checkAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const warmupProverRuntime = useCallback(async () => {
    if (runtimeStatus !== "ready") {
      setProverStatus("idle");
      return;
    }

    setProverStatus("warming");
    setProofTechnicalMessage(null);

    for (let attempt = 1; attempt <= PROVER_WARMUP_RETRY_LIMIT; attempt += 1) {
      try {
        const proverApi = getSecretWordProverApi();
        await withTimeout(
          proverApi.warmup(),
          PROVER_WARMUP_TIMEOUT_MS,
          () => resetSecretWordProverApi(),
        );
        setProverStatus("ready");
        return;
      } catch (error) {
        const rawMessage = toErrorMessage(
          error,
          "Failed to initialize proving runtime.",
        );
        console.warn("ZK prover warmup failed", { attempt, rawMessage });
        resetSecretWordProverApi();

        if (attempt >= PROVER_WARMUP_RETRY_LIMIT) {
          setProverStatus("degraded");
          setProofTechnicalMessage(rawMessage);
          setProofErrorMessage(
            "ZK warmup failed in the background. You can still generate proof; first attempt may take longer.",
          );
          return;
        }
      }
    }
  }, [runtimeStatus]);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      if (runtimeStatus !== "ready") {
        setProverStatus("idle");
        return;
      }

      await warmupProverRuntime();
      if (isCancelled) {
        return;
      }
    }

    void run();

    return () => {
      isCancelled = true;
    };
  }, [runtimeStatus, warmupProverRuntime]);

  async function handleGenerateProof() {
    if (
      !challenge ||
      challenge.challengeType !== "secret_word" ||
      !challenge.expectedHashHex
    ) {
      return;
    }

    if (runtimeStatus !== "ready") {
      toast.error("ZK runtime assets are not ready yet.");
      return;
    }

    if (proverStatus === "warming") {
      toast.error(
        "ZK prover is still warming up. Please retry in a moment.",
      );
      return;
    }

    try {
      const normalizedSecretWord =
        normalizeInputByPreset(secretWord, challenge.gamePreset);

      const challengePattern = new RegExp(challenge.inputPattern, "u");
      if (!challengePattern.test(normalizedSecretWord)) {
        toast.error(`Input format is invalid for ${challenge.inputLabel}.`);
        return;
      }

      setIsGenerating(true);
      setProofBase64(null);
      setProofBytesBase64(null);
      setVerificationKeyBase64(null);
      setPublicInputs([]);
      setPublicInputsBytesBase64(null);
      setIsValidProof(null);
      setProofErrorMessage(null);
      setProofTechnicalMessage(null);

      const computedInputHash = hashSecretWord(normalizedSecretWord);
      if (computedInputHash !== challenge.expectedHashHex.toLowerCase()) {
        setIsValidProof(false);
        setProofErrorMessage(
          "Incorrect victory code for this challenge. Check the hint and try again.",
        );
        toast.error("Incorrect victory code for this challenge.");
        return;
      }

      const proverApi = getSecretWordProverApi();
      let didSettle = false;
      const uiGuardTimerId = window.setTimeout(() => {
        if (didSettle) {
          return;
        }

        resetSecretWordProverApi();
        setProverStatus("degraded");
        setIsGenerating(false);
        toast.error(
          "Proof generation did not finish in time. Retry once; if it keeps happening, refresh the page and retry.",
        );
      }, PROOF_UI_GUARD_MS);

      const input = prepareSecretWordProofInput(
        normalizedSecretWord,
        challenge.expectedHashHex,
      );
      let result: Awaited<ReturnType<typeof proverApi.proveAndVerify>>;
      try {
        result = await withTimeout(
          proverApi.proveAndVerify(input),
          PROOF_TIMEOUT_MS,
          () => {
            resetSecretWordProverApi();
            setProverStatus("degraded");
          },
        );
      } finally {
        didSettle = true;
        window.clearTimeout(uiGuardTimerId);
      }

      setProofBase64(result.proofBase64);
      setProofBytesBase64(result.proofBytesBase64);
      setVerificationKeyBase64(result.verificationKeyBase64);
      setPublicInputs(result.publicInputs);
      setPublicInputsBytesBase64(result.publicInputsBytesBase64);
      setIsValidProof(true);
      toast.success("Zero-knowledge proof generated and verified locally.");
    } catch (error) {
      const rawMessage = toErrorMessage(error, "Unable to generate proof.");
      const friendlyMessage = toFriendlyProofError(rawMessage);
      setProofErrorMessage(friendlyMessage);
      setProofTechnicalMessage(rawMessage);
      setIsValidProof(false);
      toast.error(friendlyMessage);
      resetSecretWordProverApi();
      setProverStatus("degraded");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyProofToClipboard() {
    if (!proofBase64) return;

    try {
      await navigator.clipboard.writeText(proofBase64);
      toast.success("Proof copied to clipboard.");
    } catch {
      toast.error("Failed to copy proof.");
    }
  }

  function handleTryGuess() {
    if (
      !challenge ||
      challenge.challengeType !== "secret_word" ||
      !challenge.expectedHashHex
    ) {
      return;
    }

    const normalizedSecretWord = normalizeInputByPreset(
      secretWord,
      challenge.gamePreset,
    );
    const challengePattern = new RegExp(challenge.inputPattern, "u");

    if (!challengePattern.test(normalizedSecretWord)) {
      toast.error(`Input format is invalid for ${challenge.inputLabel}.`);
      return;
    }

    if (guessAttempts.length >= MAX_LOCAL_ATTEMPTS) {
      toast.error(
        "Attempt limit reached for this session. Generate proof if you solved it, or start a new challenge.",
      );
      return;
    }

    const digest = hashSecretWord(normalizedSecretWord);
    const matched = digest === challenge.expectedHashHex.toLowerCase();
    setIsLocalGuessMatched(matched);
    setGuessAttempts((current) => [
      {
        id: current.length + 1,
        digest: digest.slice(0, 12),
        matched,
        createdAt: Date.now(),
      },
      ...current,
    ]);

    if (matched) {
      toast.success("Correct guess candidate found. Generate ZK proof to finalize.");
      return;
    }

    toast.error("Incorrect guess. Try again.");
  }

  if (challenge === undefined) {
    return (
      <ProofStateCard
        title="Loading challenge"
        description="Fetching challenge metadata."
      />
    );
  }

  if (challenge === null) {
    return (
      <ProofStateCard
        title="Challenge not found"
        description="The challenge id is invalid or no longer exists."
      />
    );
  }

  if (challenge.challengeType !== "secret_word" || !challenge.expectedHashHex) {
    return (
      <ProofStateCard
        title="Challenge is not a playable ZK challenge"
        description="Only published secret challenge records can be opened in this workbench."
      />
    );
  }

  if (challenge.status === "draft") {
    return (
      <ProofStateCard
        title="Challenge is still in draft mode"
        description="The creator must publish this challenge from Forge before challengers can play it from Explore."
      />
    );
  }

  const isCreatorViewing = areSameStellarAddress(
    connectedAddress,
    challenge.creatorAddress,
  );
  const sessionStarted = challenge.sessionId !== undefined && challenge.sessionId !== null;
  const elapsedSeconds = sessionStarted
    ? Math.floor((clockNow - challenge.createdAt) / 1000)
    : 0;
  const secondsLeft = SESSION_WINDOW_SECONDS - elapsedSeconds;
  const matchPhaseLabel = sessionStarted
    ? challenge.status === "settled"
      ? "Settled"
      : "Live Session"
    : "Lobby";
  const selectedGame = getArcadeGame(challenge.gamePreset);
  const nextAction = !sessionStarted
    ? "Start on-chain session as challenger."
    : isValidProof !== true
      ? "Solve challenge and generate local ZK proof."
      : "Submit proof on-chain to finalize.";

  return (
    <main className="relative mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Arcade Proof Workbench</CardTitle>
          <CardDescription>
            Solve privately, generate a proof, and settle this challenge on-chain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-xs text-primary">
            Local proof generation does not require wallet connection. Wallet is only required for on-chain session start and proof submission.
          </div>

          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Title:</span>{" "}
              {challenge.title}
            </p>
            <p>
              <span className="font-medium text-foreground">Mode:</span>{" "}
              {selectedGame?.title ?? challenge.inputLabel}
            </p>
            <p>
              <span className="font-medium text-foreground">Status:</span>{" "}
              {challenge.status}
            </p>
            {challenge.hint ? (
              <p>
                <span className="font-medium text-foreground">Hint:</span>{" "}
                {challenge.hint}
              </p>
            ) : null}
            <p>
              <span className="font-medium text-foreground">Match phase:</span>{" "}
              {matchPhaseLabel}
            </p>
          </div>

          {isCreatorViewing ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              You are viewing this as the creator. Use another wallet/browser profile
              for challenger proof submission.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Swords className="h-3.5 w-3.5" />
                Live Session
              </p>
              <p className="mt-2 text-sm font-medium">
                {sessionStarted
                  ? `Session #${challenge.sessionId}`
                  : "Not started"}
              </p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Solve Window
              </p>
              <p className="mt-2 text-sm font-medium">
                {formatCountdown(secondsLeft)}
              </p>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Next Action
              </p>
              <p className="mt-2 text-sm font-medium">{nextAction}</p>
            </div>
          </div>

          {selectedGame ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">
                Play: {selectedGame.title}
              </p>
              <p className="text-xs text-muted-foreground">
                Finish your run, then submit your victory code proof below to
                settle this on-chain session.
              </p>
              <ArcadeFrame
                gameTitle={selectedGame.title}
                iframeSrc={selectedGame.iframeSrc}
              />
            </div>
          ) : null}

          {runtimeStatus === "checking" ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Checking ZK runtime assets...
            </div>
          ) : null}

          {runtimeStatus === "missing" ? (
            <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                ZK runtime assets are missing.
              </p>
              <p className="text-xs text-muted-foreground">
                Run the commands below once, then reload this page.
              </p>
              <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs">
{`pnpm zk:build`}
              </pre>
              {missingAssets.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {missingAssets.map((path) => (
                    <li key={path}>{path}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {runtimeStatus === "ready" && proverStatus === "warming" ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Initializing ZK proving runtime. First-time startup can take up to 2-3 minutes.
            </div>
          ) : null}

          {runtimeStatus === "ready" && proverStatus === "degraded" ? (
            <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Background ZK warmup failed. Proof generation is still available.
              </p>
              <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs">
{`pnpm zk:build`}
              </pre>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void warmupProverRuntime()}
              >
                Retry prover initialization
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="challenge-key" className="text-sm font-medium">
              {challenge.inputLabel}
            </label>
            <Input
              id="challenge-key"
              type="password"
              value={secretWord}
              onChange={(event) => setSecretWord(event.target.value)}
              placeholder={challenge.inputPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              Format rule: <code>{challenge.inputPattern}</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTryGuess}
              disabled={secretWord.trim().length === 0 || guessAttempts.length >= MAX_LOCAL_ATTEMPTS}
            >
              <Gamepad2 className="h-4 w-4" />
              Check guess
            </Button>
            <Button
              onClick={() => void handleGenerateProof()}
              disabled={
                runtimeStatus !== "ready" ||
                proverStatus === "warming" ||
                isGenerating ||
                secretWord.trim().length === 0
              }
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating proof
                </>
              ) : (
                "Generate ZK proof"
              )}
            </Button>

            <Button variant="secondary" asChild>
              <Link href="/explore">Back to explore</Link>
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>
              Guess attempts used: <span className="font-semibold text-foreground">{guessAttempts.length}</span> /{" "}
              {MAX_LOCAL_ATTEMPTS}
            </p>
            <p className="mt-1">
              Local guess status:{" "}
              {isLocalGuessMatched === null
                ? "No checks yet."
                : isLocalGuessMatched
                  ? "Correct candidate found."
                  : "Last checked guess was incorrect."}
            </p>
          </div>

          {guessAttempts.length > 0 ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Attempt history
              </p>
              <div className="space-y-1">
                {guessAttempts.slice(0, 6).map((attempt) => (
                  <p key={attempt.id} className="text-xs text-muted-foreground">
                    #{attempt.id} [{new Date(attempt.createdAt).toLocaleTimeString()}] hash:
                    <code className="mx-1">{attempt.digest}</code>
                    {attempt.matched ? (
                      <span className="text-emerald-500">match</span>
                    ) : (
                      <span className="text-amber-500">miss</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proof Output</CardTitle>
          <CardDescription>
            Local verification result and proof bytes that are submitted on-chain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            {proofErrorMessage ? (
              <>
                <ShieldAlert className="h-4 w-4 text-destructive" />
                {proofErrorMessage}
              </>
            ) : isValidProof === true ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Proof verified locally.
              </>
            ) : isValidProof === false ? (
              <>
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Proof failed local verification.
              </>
            ) : (
              "Generate a proof to see verification output."
            )}
          </div>

          {proofTechnicalMessage ? (
            <details>
              <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground">
                Technical error details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 text-xs break-all">
                {proofTechnicalMessage}
              </pre>
            </details>
          ) : null}

          {publicInputs.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Public inputs
              </p>
              <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                {JSON.stringify(publicInputs, null, 2)}
              </pre>
            </div>
          ) : null}

          {proofBase64 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Proof (base64)
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void copyProofToClipboard()}
                >
                  <Clipboard className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs break-all">
                {proofBase64}
              </pre>
            </div>
          ) : null}

          {verificationKeyBase64 ? (
            <details>
              <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground">
                Verification key (base64)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs break-all">
                {verificationKeyBase64}
              </pre>
            </details>
          ) : null}

          {publicInputsBytesBase64 ? (
            <details>
              <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground">
                Public input bytes (base64)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs break-all">
                {publicInputsBytesBase64}
              </pre>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">On-chain Settlement</CardTitle>
          <CardDescription>
            Session IDs are auto-detected from challenge state once created by the
            creator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnchainSubmitPanel
            challengeId={challenge._id}
            challengeCreatorAddress={challenge.creatorAddress}
            challengeSessionId={challenge.sessionId ?? null}
            challengeChallengerAddress={challenge.challengerAddress ?? null}
            proofBytesBase64={proofBytesBase64}
            publicInputsBytesBase64={publicInputsBytesBase64}
            isProofValid={isValidProof}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function ProofStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="relative mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" asChild>
            <Link href="/forge">Back to forge</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
