"use client";

import Link from "next/link";
import {
  ChevronDown,
  Compass,
  Crown,
  Gamepad2,
  Home,
  LogIn,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Unplug,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useCipherForgeAuth } from "@/features/auth/CipherForgeAuthProvider";
import { StellarWalletButton } from "@/features/wallet/StellarWalletButton";
import { useWallet } from "@/features/wallet/WalletProvider";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/forge", label: "Forge", icon: ShieldCheck },
  { href: "/arcade", label: "Arcade", icon: Gamepad2 },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/leaderboard", label: "Leaderboard", icon: Crown },
  { href: "/judge", label: "Judge", icon: Crown },
] as const;

function compactAddress(value: string) {
  return `${value.slice(0, 5)}...${value.slice(-4)}`;
}

export function AppHeader() {
  const {
    address: walletAddress,
    disconnect,
  } = useWallet();
  const { isLoading, isAuthenticated, address, signInWithSep10, signOut } =
    useCipherForgeAuth();

  async function handleSignIn() {
    try {
      await signInWithSep10();
      toast.success("Signed in with SEP-10.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed.");
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Signed out.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-out failed.");
    }
  }

  async function handleDisconnectWallet() {
    try {
      await disconnect();
      toast.success("Wallet disconnected.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Wallet disconnect failed.",
      );
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
          >
            CipherForge
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Button key={href} asChild variant="ghost" size="sm">
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Open page shortcuts">
                <Menu className="h-4 w-4" />
                <span className="hidden sm:inline">Shortcuts</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              <DropdownMenuLabel>Navigate</DropdownMenuLabel>
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/forge?tab=create">Create challenge</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/forge?tab=drafts">My drafts</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!walletAddress ? (
            <StellarWalletButton />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Wallet className="h-4 w-4" />
                  {compactAddress(walletAddress)}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-popover">
                <DropdownMenuLabel>Wallet & Session</DropdownMenuLabel>
                <div className="space-y-2 px-2 py-1 text-xs text-muted-foreground">
                  <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <Wallet className="h-3.5 w-3.5" />
                    Wallet address
                  </p>
                  <p className="break-all rounded-md border bg-muted/40 px-2 py-1 font-mono">
                    {walletAddress}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    {isAuthenticated ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    Auth status:
                    <span className="font-medium text-foreground">
                      {isLoading
                        ? "Checking..."
                        : isAuthenticated
                          ? "Authenticated"
                          : "Not authenticated"}
                    </span>
                  </p>
                  {address ? (
                    <p className="break-all">
                      Authenticated as:{" "}
                      <span className="font-mono text-foreground">{address}</span>
                    </p>
                  ) : null}
                </div>
                <DropdownMenuSeparator />
                {!isAuthenticated ? (
                  <DropdownMenuItem onClick={() => void handleSignIn()}>
                    <LogIn className="h-4 w-4" />
                    Sign in with SEP-10
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => void handleSignOut()}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => void handleDisconnectWallet()}>
                  <Unplug className="h-4 w-4" />
                  Disconnect wallet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
