import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTopicCounts } from "@/db/queries";
import { FEATURED_TOPICS, canonicalTopic, prettyTopic, topicBlurb, topicLabel } from "@/lib/topics";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Topics",
  description:
    "Browse the GitSift index by topic: AI agents, MCP, LLMs, RAG, developer tools, self-hosted software, databases and more.",
  alternates: { canonical: "/topics" },
  openGraph: {
    images: [
      {
        url: "/api/og?eyebrow=Index&title=Browse%20by%20topic&subtitle=Agent%20tooling%2C%20MCP%2C%20self-hosted%20infrastructure%2C%20databases%20and%20the%20quiet%20stack.",
        width: 1200,
        height: 630,
      },
    ],
  },
};

function canonicalCounts(): Map<string, number> {
  const raw = getTopicCounts(400);
  const map = new Map<string, number>();
  for (const item of raw) {
    const key = canonicalTopic(item.topic);
    map.set(key, (map.get(key) ?? 0) + item.count);
  }
  return map;
}

export default function TopicsPage() {
  const counts = canonicalCounts();
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const featured = FEATURED_TOPICS.map((topic) => ({
    ...topic,
    count: counts.get(topic.slug) ?? 0,
  })).filter((topic) => topic.count > 0);

  const featuredSlugs = new Set(featured.map((topic) => topic.slug));
  const rest = sorted.filter(([slug]) => !featuredSlugs.has(slug));

  return (
    <>
      <PageHeader
        eyebrow="Index"
        title="Browse by topic"
        intro="A topic page is not a tag dump. It is the same signal-ranked ledger, narrowed to one corner of the stack — so you can see what is moving inside AI agents, databases or self-hosted software without the rest of the firehose."
        aside={
          <div className="space-y-4">
            <p className="eyebrow">Coordinates</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3 border-b border-line pb-2">
                <dt className="text-muted">Featured topics</dt>
                <dd className="tnum font-mono">{featured.length}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-2">
                <dt className="text-muted">Topics with 2+ repos</dt>
                <dd className="tnum font-mono">{sorted.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Ranking</dt>
                <dd className="font-mono">signal, not size</dd>
              </div>
            </dl>
          </div>
        }
      />

      <section className="page py-14">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div>
            <p className="eyebrow">Where the action is</p>
            <h2 className="display mt-2 text-3xl md:text-4xl">Featured corners</h2>
          </div>
          <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
            Chosen because they are where hackathon builders and AI engineers are actually spending
            their weekends.
          </p>
        </div>

        <div className="mt-2 grid gap-x-12 lg:grid-cols-2">
          {featured.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="group grid grid-cols-[1fr_auto] items-start gap-4 border-b border-line py-5"
            >
              <div>
                <h3 className="text-lg font-medium transition-colors group-hover:text-signal-ink">
                  {topic.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{topicBlurb(topic.slug)}</p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <span className="tnum font-mono text-[10px] text-muted">{topic.count}</span>
                <ArrowRight className="size-3.5 text-line-strong transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="page border-t border-line py-14">
        <div className="flex items-end justify-between border-b border-line pb-4">
          <div>
            <p className="eyebrow">The long tail</p>
            <h2 className="display mt-2 text-3xl md:text-4xl">All topics</h2>
          </div>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-muted sm:block">
            {rest.length} more with at least two repos
          </p>
        </div>

        <div className="mt-6 columns-1 gap-x-12 sm:columns-2 lg:columns-3">
          {rest.map(([slug, count]) => (
            <Link
              key={slug}
              href={`/topics/${encodeURIComponent(slug)}`}
              className="group flex break-inside-avoid items-baseline justify-between gap-4 border-b border-line py-2.5"
            >
              <span className="text-[13px] text-ink-2 transition-colors group-hover:text-signal-ink">
                {topicLabel(slug)}
              </span>
              <span className="tnum font-mono text-[10px] text-muted">{count}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
