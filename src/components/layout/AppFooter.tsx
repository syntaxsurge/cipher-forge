import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          CipherForge · ZK gameplay on Stellar Testnet
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/arcade" className="hover:text-foreground">
            Arcade
          </Link>
          <Link href="/judge" className="hover:text-foreground">
            Judge Mode
          </Link>
          <a
            href="https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Protocol 25
          </a>
          <a
            href="https://lab.stellar.org/smart-contracts/contract-explorer"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Stellar Lab
          </a>
        </div>
      </div>
    </footer>
  );
}
