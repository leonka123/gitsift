import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : request.headers.get("x-cron-secret") ?? "";
  if (!provided) return false;

  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured. Set it before enabling scheduled ingestion." },
      { status: 503 },
    );
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const maxQueries = Number(params.get("maxQueries") ?? 0) || undefined;

  try {
    const result = await runIngest({ maxQueries });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("ingest failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Ingest failed." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Use POST with Authorization: Bearer $CRON_SECRET." },
    { status: 405 },
  );
}
