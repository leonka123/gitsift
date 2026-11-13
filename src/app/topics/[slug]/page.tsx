import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFeed, getTopicCounts } from "@/db/queries";
import {
  canonicalTopic,
  prettyTopic,
  topicAliases,
  topicBlurb,
  topicLabel,
} from "@/lib/topics";
import { PageHeader } from "@/components/ui";
import { RepoRowList } from "@/components/repo-row";
import { SignalLegend } from "@/components/signal-meter";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = canonicalTopic(decodeURIComponent(raw).toLowerCase());
  const title = topicLabel(slug);
  const description = topicBlurb(slug);
  return {
    title: `${title} — rising repositories`,
    description,
    alternates: { canonical: `/topics/${slug}` },
    openGraph: {
      images: [
        {
          url: `/api/og?eyebrow=Topic&title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(
            description,
          )}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function TopicPage({ params }: Params) {
  const { slug: raw } = await params;
  const decoded = decodeURIComponent(raw).toLowerCase();
  if (!decoded || decoded.length > 80) notFound();

  const slug = canonicalTopic(decoded);
  const aliases = topicAliases(slug);
  const feed = getFeed({ mode: "rising", topics: aliases, limit: 40 });
  const counts = getTopicCounts(400);
  const related = new Map<string, number>();
  for (const repo of feed.repos) {
    for (const topic of repo.topics) {
      if (aliases.includes(canonicalTopic(topic))) continue;
      const key = canonicalTopic(topic);
      related.set(key, (related.get(key) ?? 0) + 1);
    }
  }
  const relatedTopics = [...related.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const total = counts
    .filter((item) => aliases.includes(canonicalTopic(item.topic)))
    .reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <PageHeader
        eyebrow={`Topic · ${prettyTopic(slug)}`}
        title={topicLabel(slug)}
        intro={topicBlurb(slug)}
        aside={
          <div className="space-y-5">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3 border-b border-line pb-2">
                <dt className="text-muted">Indexed tags</dt>
                <dd className="tnum font-mono">{total}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-line pb-2">
                <dt className="text-muted">Showing</dt>
                <dd className="tnum font-mono">{feed.repos.length} ranked</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Window</dt>
                <dd className="font-mono">3 years</dd>
              </div>
            </dl>
            <div>
              <p className="eyebrow">Signal scale</p>
              <div className="mt-3">
                <SignalLegend />
              </div>
            </div>
            <Link
              href={`/search?q=${encodeURIComponent(`best ${prettyTopic(slug)} project`)}`}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
            >
              Search this topic →
            </Link>
          </div>
        }
      />

      <section className="page py-10">
        {feed.repos.length ? (
          <>
            <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Ranked by signal · {aliases.length > 1 ? `${aliases.length} tag variants merged` : "single tag"}
              </p>
              <Link href="/trending" className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink">
                Full ledger →
              </Link>
            </div>
            <RepoRowList repos={feed.repos} />
          </>
        ) : (
          <div className="py-16">
            <p className="display text-4xl">Nothing tagged {topicLabel(slug)} yet.</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
              Topics only appear after at least two repositories carry the tag. Try the full ledger or
              a broader search while this corner fills up.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/trending" className="border border-line-strong px-4 py-2 text-sm hover:border-ink hover:bg-ink hover:text-paper">
                Full ledger
              </Link>
              <Link href="/search" className="border border-line px-4 py-2 text-sm text-ink-2 hover:border-ink hover:text-ink">
                Search by problem
              </Link>
            </div>
          </div>
        )}

        {relatedTopics.length ? (
          <div className="mt-12 border-t border-line pt-6">
            <p className="eyebrow">Adjacent corners</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedTopics.map(([topic, count]) => (
                <Link
                  key={topic}
                  href={`/topics/${topic}`}
                  className="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-2 transition-colors hover:border-ink hover:text-ink"
                >
                  {topicLabel(topic)} <span className="text-muted">{count}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
