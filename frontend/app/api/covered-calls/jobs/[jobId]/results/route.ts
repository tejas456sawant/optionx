import { NextRequest, NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://127.0.0.1:8000";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { jobId } = await context.params;
  const upstreamUrl = new URL(`/covered-calls/jobs/${jobId}/results`, backendUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
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
