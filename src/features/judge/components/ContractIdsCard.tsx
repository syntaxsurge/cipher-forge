"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ContractValue = {
  label: string;
  value: string | undefined;
};

function CopyRow({ label, value }: ContractValue) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="break-all font-mono text-xs">
          {value ?? "Not configured"}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="shrink-0"
        onClick={() => void handleCopy()}
        disabled={!value}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function ContractIdsCard() {
  const values: ContractValue[] = [
    {
      label: "Game Hub Contract",
      value:
        process.env.NEXT_PUBLIC_CF_HUB_CONTRACT_ID ??
        process.env.NEXT_PUBLIC_GAME_HUB_CONTRACT_ID,
    },
    {
      label: "CipherForge Game Contract",
      value: process.env.NEXT_PUBLIC_CF_GAME_CONTRACT_ID,
    },
    {
      label: "UltraHonk Verifier Contract",
      value: process.env.NEXT_PUBLIC_CF_ULTRAHONK_VERIFIER_CONTRACT_ID,
    },
    {
      label: "Stellar RPC URL",
      value: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
    },
    {
      label: "Network Passphrase",
      value: process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Testnet Contract Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          These values are exported by{" "}
          <code>pnpm contracts:export:testnet</code> into
          <code> docs/.env.testnet.public</code> and used for judge
          verification.
        </p>
        <div className="space-y-2">
          {values.map((entry) => (
            <CopyRow
              key={entry.label}
              label={entry.label}
              value={entry.value}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
