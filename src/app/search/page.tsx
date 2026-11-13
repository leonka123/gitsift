import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui";
import { SearchExperience } from "@/components/search-experience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — describe what you are building",
  description:
    "Describe the job, not the keyword. GitSift searches 1,000+ open-source repositories by meaning, keywords and signal strength.",
  alternates: { canonical: "/search" },
  openGraph: {
    images: [
      {
        url: "/api/og?eyebrow=Search&title=Describe%20what%20you%20are%20building.&subtitle=One%20query%2C%20ten%20useful%20repositories%2C%20with%20a%20reason%20for%20each.",
        width: 1200,
        height: 630,
      },
    ],
  },
};

const EXAMPLES = [
  {
    label: "AI agent that can use a browser",
    query: "AI agent that can use a browser and extract structured data",
  },
  {
    label: "Self-hosted analytics for a small product",
    query: "self-hosted analytics with Postgres support",
  },
  {
    label: "MCP server for my own API",
    query: "MCP server framework for exposing an API to Claude",
  },
  {
    label: "Rust CLI with nice error messages",
    query: "Rust CLI framework with good error messages",
  },
  {
    label: "Инструмент для парсинга сайтов",
    query: "инструмент для парсинга сайтов на Python",
  },
  {
    label: "Cheap vector search, no cloud",
    query: "local vector database for embeddings without cloud",
  },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").slice(0, 300);

  return (
    <div className="page pb-20 pt-12 md:pt-16">
      <div className="max-w-4xl">
        <Eyebrow>Semantic search · English and Russian</Eyebrow>
        <h1 className="display mt-3 text-[clamp(2.5rem,5.5vw,4.5rem)]">
          Describe the job.
          <br />
          Not the keyword.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-2">
          You are building something. Say what it needs to do, and GitSift returns ten repositories
          that fit — with what matched, why it surfaced, and what to watch out for.
        </p>
      </div>

      <div className="mt-10">
        <SearchExperience initialQuery={query} examples={EXAMPLES} />
      </div>
    </div>
  );
}
