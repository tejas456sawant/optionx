import { NextRequest, NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const upstreamUrl = new URL("/covered-calls", backendUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(180_000),
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend unavailable.";
    return NextResponse.json(
      {
        detail: `Could not reach backend at ${backendUrl}: ${message}`,
      },
      { status: 502 },
    );
  }
}
