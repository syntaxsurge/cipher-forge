import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { signAccessToken, verifyRefreshToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("cf_refresh")?.value;

  const unauthenticatedPayload = {
    authenticated: false,
  } as const;
  const noStoreHeaders = {
    "Cache-Control": "no-store",
  };

  if (!refreshToken) {
    return NextResponse.json(unauthenticatedPayload, {
      status: 200,
      headers: noStoreHeaders,
    });
  }

  const address = await verifyRefreshToken(refreshToken).catch(() => null);

  if (!address) {
    return NextResponse.json(unauthenticatedPayload, {
      status: 200,
      headers: noStoreHeaders,
    });
  }

  const accessToken = await signAccessToken(address);

  return NextResponse.json(
    {
      authenticated: true,
      address,
      accessToken,
    },
    {
      headers: noStoreHeaders,
    },
  );
}
