import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractIdsCard } from "@/features/judge/components/ContractIdsCard";

const journeySteps = [
  {
    title: "1. Landing",
    route: "/",
    actions: ["Read the concept", "Click Open Forge or Judge Mode"],
  },
  {
    title: "2. Creator Flow",
    route: "/forge",
    actions: [
      "Connect Testnet wallet",
      "Authenticate using SEP-10",
      "Create a Secret Word draft",
      "Open the generated proof workbench link",
    ],
  },
  {
    title: "3. Solver + On-chain Settlement",
    route: "/forge/<challengeId>/prove",
    actions: [
      "Connect solver wallet",
      "Generate proof in-browser",
      "Start on-chain session via create_session",
      "Submit proof bytes via submit_proof",
      "Confirm final status in UI",
    ],
  },
];

export const metadata = {
  title: "Judge Mode | CipherForge",
  description:
    "Step-by-step judge walkthrough for CipherForge zero-knowledge gameplay and Stellar testnet verification.",
};

export default function JudgeModePage() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  const gameContractId = process.env.NEXT_PUBLIC_CF_GAME_CONTRACT_ID;
  const verifierContractId = process.env.NEXT_PUBLIC_CF_ULTRAHONK_VERIFIER_CONTRACT_ID;

  const labGameExplorerUrl = gameContractId
    ? `https://lab.stellar.org/smart-contracts/contract-explorer?network=testnet&rpcUrl=${encodeURIComponent(
        rpcUrl,
      )}&contractId=${encodeURIComponent(gameContractId)}`
    : "https://lab.stellar.org/smart-contracts/contract-explorer";
  const labVerifierExplorerUrl = verifierContractId
    ? `https://lab.stellar.org/smart-contracts/contract-explorer?network=testnet&rpcUrl=${encodeURIComponent(
        rpcUrl,
      )}&contractId=${encodeURIComponent(verifierContractId)}`
    : "https://lab.stellar.org/smart-contracts/contract-explorer";

  const stellarExpertGameUrl = gameContractId
    ? `https://stellar.expert/explorer/testnet/contract/${gameContractId}`
    : "https://stellar.expert/explorer/testnet";
  const stellarExpertVerifierUrl = verifierContractId
    ? `https://stellar.expert/explorer/testnet/contract/${verifierContractId}`
    : "https://stellar.expert/explorer/testnet";

  return (
    <main className="relative mx-auto min-h-screen max-w-5xl space-y-8 px-6 py-12">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold">Judge Mode</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          This page provides a deterministic walkthrough for judging the
          complete CipherForge lifecycle: challenge creation, browser proof
          generation, on-chain game session start, and on-chain proof
          verification on Stellar Testnet.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/forge">Open Forge</Link>
          </Button>
          <Button asChild variant="secondary">
            <a
              href={labGameExplorerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Game Contract in Stellar Lab
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={labVerifierExplorerUrl} target="_blank" rel="noreferrer">
              Open Verifier in Stellar Lab
            </a>
          </Button>
        </div>
      </section>

      <ContractIdsCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Independent Contract Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use Stellar Lab for method-level contract inspection and use Stellar Expert
            for direct transaction and storage browsing.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={stellarExpertGameUrl} target="_blank" rel="noreferrer">
                Open Game Contract on Stellar Expert
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={stellarExpertVerifierUrl} target="_blank" rel="noreferrer">
                Open Verifier Contract on Stellar Expert
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4">
        {journeySteps.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="text-xl">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Route: <code>{step.route}</code>
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {step.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verification Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Proof generation is done fully in-browser with Noir + UltraHonk.
            </li>
            <li>
              Game contract calls hub lifecycle methods (<code>start_game</code>{" "}
              and
              <code> end_game</code>) on Stellar Testnet.
            </li>
            <li>
              Proof bytes and flattened public input bytes are submitted
              on-chain.
            </li>
            <li>
              Contract IDs and RPC endpoint are exportable through
              <code> pnpm contracts:export:testnet</code>.
            </li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
