import { NextRequest, NextResponse } from "next/server";

/**
 * The visitor's approximate location, for the live-cursor avatars: the city and country
 * Vercel's network derives from their IP address. Only the place name leaves the
 * server, never the address. Both are null outside Vercel (e.g. local development).
 */
export function GET(request: NextRequest) {
  const city = request.headers.get("x-vercel-ip-city");
  const country = request.headers.get("x-vercel-ip-country");

  return NextResponse.json(
    {
      city: city ? decodeURIComponent(city) : null,
      country: country || null,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
