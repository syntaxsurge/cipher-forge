"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2, Loader2, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCipherForgeGameClient } from "@/features/challenges/hooks/useCipherForgeGameClient";
import { useWallet } from "@/features/wallet/WalletProvider";
import {
  recordProofSettlementRef,
  recordSessionStartRef,
} from "@/lib/convex/function-references";
import {
  checkStellarAccountExists,
  fundTestnetAccount,
} from "@/lib/stellar/accounts";
import {
  areSameStellarAddress,
  normalizeStellarAddress,
} from "@/lib/stellar/address";
import { base64ToBuffer } from "@/lib/utils/base64";

type OnchainSubmitPanelProps = {
  challengeId: string;
  challengeCreatorAddress: string;
  challengeSessionId: number | null;
  challengeChallengerAddress: string | null;
  proofBytesBase64: string | null;
  publicInputsBytesBase64: string | null;
  isProofValid: boolean | null;
};

type RustResultLike<T> = {
  isErr: () => boolean;
  isOk: () => boolean;
  unwrap: () => T;
  unwrapErr: () => { message: string };
};

function isRustResultLike<T>(value: unknown): value is RustResultLike<T> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "isErr" in value &&
    typeof value.isErr === "function" &&
    "isOk" in value &&
    typeof value.isOk === "function" &&
    "unwrap" in value &&
    typeof value.unwrap === "function" &&
    "unwrapErr" in value &&
    typeof value.unwrapErr === "function"
  );
}

function unwrapContractResult<T>(value: unknown): T {
  if (isRustResultLike<T>(value)) {
    if (value.isErr()) {
      throw new Error(value.unwrapErr().message);
    }

    return value.unwrap();
  }

  return value as T;
}

function toFriendlyStellarError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Transaction failed.";
  const normalized = message.toLowerCase();
  const accountNotFoundMatch = /account not found:\s*([a-z0-9]+)/iu.exec(message);

  if (
    normalized.includes("op_underfunded") ||
    normalized.includes("underfunded") ||
    normalized.includes("insufficient") ||
    normalized.includes("reserve")
  ) {
    return "Transaction failed because the wallet balance is too low for fees/reserves. Fund the wallet on Stellar Testnet and retry.";
  }

  if (normalized.includes("tx_bad_auth") || normalized.includes("bad auth")) {
    return "Transaction signature was rejected. Reconnect your wallet and approve the prompt again.";
  }

  if (normalized.includes("account not found")) {
    const accountId = accountNotFoundMatch?.[1]?.toUpperCase();
    return `Stellar account${accountId ? ` ${accountId}` : ""} is missing on testnet. Fund it with Friendbot, then retry.`;
  }

  if (normalized.includes("create_session")) {
    return `Unable to start session: ${message}`;
  }

  if (normalized.includes("submit_proof")) {
    return `Unable to submit proof: ${message}`;
  }

  return message;
}

export function OnchainSubmitPanel({
  challengeId,
  challengeCreatorAddress,
  challengeSessionId,
  challengeChallengerAddress,
  proofBytesBase64,
  publicInputsBytesBase64,
  isProofValid,
}: OnchainSubmitPanelProps) {
  const client = useCipherForgeGameClient();
  const recordSessionStart = useMutation(recordSessionStartRef);
  const recordProofSettlement = useMutation(recordProofSettlementRef);
  const { address: connectedAddress, refreshAddress } = useWallet();

  const creatorAddress = normalizeStellarAddress(challengeCreatorAddress);
  const connected = normalizeStellarAddress(connectedAddress);

  const [challengerAddress, setChallengerAddress] = useState(() =>
    normalizeStellarAddress(challengeChallengerAddress),
  );
  const [sessionId, setSessionId] = useState<number | null>(challengeSessionId);
  const [status, setStatus] = useState<string>("Waiting for session start.");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missingAccounts, setMissingAccounts] = useState<string[]>([]);
  const [fundingAddress, setFundingAddress] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(challengeSessionId);
  }, [challengeSessionId]);

  useEffect(() => {
    const persistedChallenger = normalizeStellarAddress(challengeChallengerAddress);
    if (persistedChallenger) {
      setChallengerAddress(persistedChallenger);
    }
  }, [challengeChallengerAddress]);

  useEffect(() => {
    const persistedChallenger = normalizeStellarAddress(challengeChallengerAddress);
    if (
      persistedChallenger ||
      !connected ||
      areSameStellarAddress(connected, creatorAddress)
    ) {
      return;
    }

    setChallengerAddress((current) => (current ? current : connected));
  }, [challengeChallengerAddress, connected, creatorAddress]);

  const normalizedChallengerAddress = normalizeStellarAddress(challengerAddress);

  const isCreatorConnected = areSameStellarAddress(connected, creatorAddress);
  const isConnectedAsPersistedChallenger =
    !challengeChallengerAddress ||
    areSameStellarAddress(connected, challengeChallengerAddress);

  const proofReady = !!proofBytesBase64 && !!publicInputsBytesBase64;
  const canStartSession =
    !!client &&
    !sessionId &&
    connected.length > 0 &&
    !isCreatorConnected &&
    areSameStellarAddress(connected, normalizedChallengerAddress) &&
    !isStarting;
  const canSubmitProof =
    !!client &&
    sessionId !== null &&
    proofReady &&
    isProofValid !== false &&
    !isCreatorConnected &&
    isConnectedAsPersistedChallenger &&
    !isSubmitting;

  const settlementStepText = useMemo(() => {
    if (sessionId === null) {
      return "Step 1: Start an on-chain session.";
    }

    if (!proofReady) {
      return "Step 2: Generate a local ZK proof.";
    }

    return "Step 3: Submit proof on-chain.";
  }, [proofReady, sessionId]);

  async function preflightSessionStartAccounts() {
    const requiredAddresses = [creatorAddress, normalizedChallengerAddress].filter(
      (address): address is string => address.length > 0,
    );
    const accountChecks = await Promise.all(
      requiredAddresses.map(async (address) => ({
        address,
        result: await checkStellarAccountExists(address),
      })),
    );
    const missing = accountChecks
      .filter((item) => !item.result.exists)
      .map((item) => item.address);
    setMissingAccounts(missing);

    if (missing.length > 0) {
      throw new Error(
        `These Stellar testnet accounts are not funded yet: ${missing.join(", ")}`,
      );
    }
  }

  async function handleFundAccount(address: string) {
    try {
      setFundingAddress(address);
      await fundTestnetAccount(address);
      const check = await checkStellarAccountExists(address);
      if (!check.exists) {
        throw new Error("Funding request completed but account is still unavailable.");
      }

      setMissingAccounts((current) => current.filter((item) => item !== address));
      toast.success(`Funded ${address} on Stellar testnet.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fund Stellar account.",
      );
    } finally {
      setFundingAddress(null);
    }
  }

  async function handleStartSession() {
    if (!client) {
      toast.error("Connect your wallet first.");
      return;
    }

    const latestConnectedAddress = normalizeStellarAddress(
      (await refreshAddress(false)) ?? connected,
    );

    if (!latestConnectedAddress) {
      toast.error("Connect your wallet first.");
      return;
    }

    if (!normalizedChallengerAddress) {
      toast.error("A challenger wallet address is required.");
      return;
    }

    if (!areSameStellarAddress(latestConnectedAddress, normalizedChallengerAddress)) {
      toast.error(
        `Connected wallet must match challenger wallet. Connected: ${latestConnectedAddress} | Challenger: ${normalizedChallengerAddress}`,
      );
      return;
    }

    if (areSameStellarAddress(latestConnectedAddress, creatorAddress)) {
      toast.error(
        "Switch to challenger wallet to start session. Creator wallet cannot start sessions in this flow.",
      );
      return;
    }

    if (areSameStellarAddress(normalizedChallengerAddress, creatorAddress)) {
      toast.error("Creator and challenger must be different wallets.");
      return;
    }

    try {
      setIsStarting(true);
      setStatus("Checking Stellar testnet accounts...");
      await preflightSessionStartAccounts();

      setStatus("Preparing create_session transaction...");

      const assembledTx = await client.create_session({
        player1: creatorAddress,
        player2: normalizedChallengerAddress,
      });

      setStatus("Waiting for wallet signature...");
      const sentTx = await assembledTx.signAndSend();
      const createdSessionId = unwrapContractResult<number>(sentTx.result);

      await recordSessionStart({
        challengeId,
        sessionId: createdSessionId,
        challengerAddress: normalizedChallengerAddress,
      });

      setSessionId(createdSessionId);
      setStatus(`Session ${createdSessionId} started on-chain.`);
      toast.success(`Session ${createdSessionId} started.`);
    } catch (error) {
      const message = toFriendlyStellarError(error);
      setStatus(message);
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSubmitProof() {
    if (!client) {
      toast.error("Connect your wallet first.");
      return;
    }

    const latestConnectedAddress = normalizeStellarAddress(
      (await refreshAddress(false)) ?? connected,
    );

    if (!latestConnectedAddress) {
      toast.error("Connect your wallet first.");
      return;
    }

    if (sessionId === null) {
      toast.error("Start or wait for an on-chain session first.");
      return;
    }

    if (!proofBytesBase64 || !publicInputsBytesBase64) {
      toast.error("Generate a ZK proof first.");
      return;
    }

    if (isProofValid === false) {
      toast.error("Local proof verification failed. Generate a valid proof first.");
      return;
    }

    if (areSameStellarAddress(latestConnectedAddress, creatorAddress)) {
      toast.error("Creators cannot submit proof for their own challenge.");
      return;
    }

    if (!isConnectedAsPersistedChallenger) {
      toast.error("Only the registered challenger wallet can submit this proof.");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus("Preparing submit_proof transaction...");

      const assembledTx = await client.submit_proof({
        session_id: sessionId,
        public_inputs: base64ToBuffer(publicInputsBytesBase64),
        proof_bytes: base64ToBuffer(proofBytesBase64),
      });

      setStatus("Waiting for wallet signature...");
      const sentTx = await assembledTx.signAndSend();
      unwrapContractResult<void>(sentTx.result);

      await recordProofSettlement({
        challengeId,
        sessionId,
        solverAddress: latestConnectedAddress,
      });

      setStatus(`Proof accepted on-chain for session ${sessionId}.`);
      toast.success("Proof accepted on-chain.");
    } catch (error) {
      const message = toFriendlyStellarError(error);
      setStatus(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 rounded-lg border bg-card/90 p-4">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Seamless settlement flow
        </div>
        <p className="text-sm text-muted-foreground">{settlementStepText}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Creator wallet
          </label>
          <Input value={creatorAddress} readOnly className="font-mono text-xs" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Challenger wallet
          </label>
          {challengeChallengerAddress ? (
            <Input
              value={normalizeStellarAddress(challengeChallengerAddress)}
              readOnly
              className="font-mono text-xs"
            />
          ) : (
            <Input
              value={challengerAddress}
              onChange={(event) => setChallengerAddress(event.target.value)}
              placeholder="Auto-filled from connected challenger wallet"
              className="font-mono text-xs"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Session id
          </label>
          <Input
            value={sessionId === null ? "Not started" : String(sessionId)}
            readOnly
            className="font-mono text-xs"
          />
        </div>
      </div>

      {!challengeChallengerAddress && connected && connected !== creatorAddress ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setChallengerAddress(connected)}
          className="w-fit"
        >
          Use my wallet as challenger
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void handleStartSession()} disabled={!canStartSession}>
          {isStarting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Starting session
            </>
          ) : sessionId === null ? (
            "Start on-chain session"
          ) : (
            "Session started"
          )}
        </Button>

        <Button onClick={() => void handleSubmitProof()} disabled={!canSubmitProof}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting proof
            </>
          ) : (
            "Submit proof on-chain"
          )}
        </Button>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          {isProofValid ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          )}
          Local proof status: {isProofValid === true ? "valid" : isProofValid === false ? "invalid" : "not generated"}
        </p>
        <p>
          Session start requires challenger wallet authorization.
          Connected wallet: {connected || "none"}.
          Creator wallet: {creatorAddress || "unknown"}.
        </p>
      </div>

      {missingAccounts.length > 0 ? (
        <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <p className="font-medium">
            Missing Stellar testnet accounts detected. Fund them before starting the session.
          </p>
          <div className="flex flex-wrap gap-2">
            {missingAccounts.map((address) => (
              <Button
                key={address}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleFundAccount(address)}
                disabled={fundingAddress !== null}
              >
                {fundingAddress === address ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Funding{" "}
                    {address.slice(0, 6)}...
                  </>
                ) : (
                  `Fund ${address.slice(0, 6)}...${address.slice(-4)}`
                )}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Status:</span> {status}
      </div>
    </div>
  );
}
