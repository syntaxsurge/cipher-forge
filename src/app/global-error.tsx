"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-2xl font-semibold">A fatal error occurred</h1>
          <p className="text-sm text-muted-foreground">
            The application failed to recover. Retry the request.
          </p>
          <Button onClick={reset}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
