"use client";

import { Loader2, Unplug, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/features/wallet/WalletProvider";

function shorten(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function StellarWalletButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { address, refreshAddress, disconnect } = useWallet();

  async function handleConnect() {
    try {
      setIsConnecting(true);
      const connectedAddress = await refreshAddress(false);

      if (!connectedAddress) {
        toast.error(
          "Wallet connection was not approved. Open Freighter and allow access.",
        );
        return;
      }

      toast.success(`Connected ${shorten(connectedAddress)}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Wallet connection failed.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      setIsDisconnecting(true);
      await disconnect();
      toast.success("Wallet disconnected.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Wallet disconnect failed.",
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (!address) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={() => void handleConnect()}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Connecting
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" /> Connect wallet
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => void handleDisconnect()}
      disabled={isDisconnecting}
    >
      {isDisconnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Disconnecting
        </>
      ) : (
        <>
          <Unplug className="h-4 w-4" /> {shorten(address)}
        </>
      )}
    </Button>
  );
}
