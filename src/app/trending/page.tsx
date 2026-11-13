import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getFeed, getStats } from "@/db/queries";
import { formatCompact, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { RepoRowList } from "@/components/repo-row";
import { SignalLegend } from "@/components/signal-meter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rising repositories",
  description:
    "The GitSift ledger: open-source repositories ranked by momentum, freshness, activity and quality — not by total stars.",
  alternates: { canonical: "/trending" },
  openGraph: {
    images: [
      {
        url: "/api/og?eyebrow=The%20ledger&title=Rising%20right%20now&subtitle=Momentum%20beats%20total%20stars.%20Updated%20continuously.&meta=Signal%20%C2%B7%20quality%20%C2%B7%20freshness",
        width: 1200,
        height: 630,
      },
    ],
  },
};

const PAGE_SIZE = 25;

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(Number(params.page ?? 1) || 1, 20));
  const offset = (page - 1) * PAGE_SIZE;
  const feed = getFeed({ mode: "rising", limit: PAGE_SIZE, offset });
  const stats = getStats();

  return (
    <>
      <PageHeader
        eyebrow="The ledger · updated on every ingest"
        title="Rising right now"
        intro="Ranked by signal: a percentile built from stars per day, project age, last push, scale and a quality prior. A five-year-old project with 80k stars can sit below a three-week-old tool — if the tool is actually moving."
        aside={
          <div className="space-y-5">
            <div>
              <p className="eyebrow">Signal scale</p>
              <div className="mt-3">
                <SignalLegend />
              </div>
            </div>
            <dl className="space-y-2 border-t border-line pt-4 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Index size</dt>
                <dd className="tnum font-mono">{formatCompact(stats.repos)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Stars represented</dt>
                <dd className="tnum font-mono">{formatCompact(stats.totalStars)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Last refresh</dt>
                <dd className="font-mono">{stats.updatedAt ? timeAgo(stats.updatedAt) : "today"}</dd>
              </div>
            </dl>
            <a
              href="/api/repos?mode=rising&limit=25"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
            >
              This list as JSON <ArrowRight className="size-3" aria-hidden />
            </a>
          </div>
        }
      />

      <section className="page py-10">
        <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Page {page} · showing {feed.repos.length} of the current window
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.1em] text-muted sm:block">
            Rank · signal · repository · momentum
          </p>
        </div>

        <RepoRowList repos={feed.repos} startRank={offset + 1} />

        <div className="mt-8 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={`/trending?page=${page - 1}`}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
            >
              <ArrowLeft className="size-3.5" aria-hidden /> Previous
            </Link>
          ) : (
            <span />
          )}
          {feed.hasMore ? (
            <Link
              href={`/trending?page=${page + 1}`}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
            >
              Next page <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              End of the ledger
            </span>
          )}
        </div>
      </section>
    </>
  );
}
