import { NextResponse } from "next/server";

import { getPublicJwk } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export async function GET() {
  const jwk = await getPublicJwk();

  return NextResponse.json(
    {
      keys: [jwk],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
