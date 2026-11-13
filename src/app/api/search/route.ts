import { NextResponse, type NextRequest } from "next/server";
import { search } from "@/lib/search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").slice(0, 300).trim();

  if (!query) {
    return NextResponse.json(
      { error: "Missing ?q= parameter. Describe what you are building." },
      { status: 400 },
    );
  }

  try {
    const response = await search(query, {
      limit: clampInt(params.get("limit"), 10, 1, 20),
      minStars: clampInt(params.get("minStars"), 0, 0, 1_000_000),
      language: params.get("language") ?? undefined,
      license: params.get("license") ?? undefined,
      selfHosted: params.get("selfHosted") === "1" || params.get("selfHosted") === "true",
    });

    // Keep the public payload small: search results never need the full README.
    const results = response.results.map((result) => {
      const { readme, ...repo } = result.repo;
      return {
        ...result,
        repo: { ...repo, readmeChars: readme?.length ?? 0 },
      };
    });

    return NextResponse.json(
      { ...response, results },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Search-Mode": response.mode,
        },
      },
    );
  } catch (error) {
    console.error("search failed", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
