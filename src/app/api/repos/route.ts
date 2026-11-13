import { NextResponse, type NextRequest } from "next/server";
import { getFeed, type FeedQuery } from "@/db/queries";
import type { FeedMode, Repo } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODES: FeedMode[] = ["rising", "new", "gems", "top"];

function parseMode(value: string | null): FeedMode {
  return MODES.includes(value as FeedMode) ? (value as FeedMode) : "rising";
}

function publicRepo(repo: Repo) {
  const { readme, ...rest } = repo;
  return {
    ...rest,
    readmeChars: readme?.length ?? 0,
    githubUrl: `https://github.com/${repo.fullName}`,
    url: `/repo/${repo.owner}/${repo.name}`,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 20) || 20, 1), 60);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);

  const query: FeedQuery = {
    mode: parseMode(params.get("mode")),
    limit,
    offset,
    language: params.get("language") ?? undefined,
    topic: params.get("topic") ?? undefined,
    minStars: Number(params.get("minStars") ?? 0) || undefined,
    // `window` is the UI's parameter name; accept both so hand-written API calls are forgiving.
    windowDays: Math.min(
      Math.max(Number(params.get("windowDays") ?? params.get("window") ?? 7) || 7, 1),
      365,
    ),
  };

  try {
    const feed = getFeed(query);
    return NextResponse.json(
      {
        mode: query.mode,
        count: feed.repos.length,
        hasMore: feed.hasMore,
        nextOffset: feed.hasMore ? offset + feed.repos.length : null,
        generatedAt: new Date().toISOString(),
        repos: feed.repos.map(publicRepo),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("repos api failed", error);
    return NextResponse.json({ error: "Could not read the repository index." }, { status: 500 });
  }
}
