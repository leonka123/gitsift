import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Repo } from "@/types";
import { formatCompact, repoHref, timeAgo } from "@/lib/utils";
import { prettyTopic } from "@/lib/topics";
import { SignalMeter } from "./signal-meter";
import { Sparkline, modeledSeries } from "./sparkline";

function TopicLine({ topics }: { topics: string[] }) {
  if (!topics.length) return null;
  return (
    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.07em] text-muted">
      {topics.slice(0, 4).map((topic, index) => (
        <span key={topic}>
          {index > 0 ? <span className="mx-1.5 text-line-strong">·</span> : null}
          {prettyTopic(topic)}
        </span>
      ))}
    </p>
  );
}

export function RepoRow({
  repo,
  rank,
  showTrend = true,
  compact = false,
}: {
  repo: Repo;
  rank?: number;
  showTrend?: boolean;
  compact?: boolean;
}) {
  const isFresh = Date.now() - new Date(repo.createdAt).getTime() < 45 * 86_400_000;

  return (
    <article className="hover-row group relative grid grid-cols-[1fr_auto] items-start gap-x-5 border-t border-line py-5 first:border-t-0 md:grid-cols-[2rem_1rem_1fr_auto] md:gap-x-4">
      {rank !== undefined ? (
        <span className="tnum hidden pt-1 font-mono text-[11px] text-muted md:block">
          {String(rank).padStart(2, "0")}
        </span>
      ) : (
        <span className="hidden md:block" />
      )}

      <span className="hidden pt-1.5 md:block">
        <SignalMeter heat={repo.heat} />
      </span>

      <div className="min-w-0">
        <h3 className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium leading-snug">
          <Link href={repoHref(repo.fullName)} className="link-slide text-ink">
            <span className="text-muted">{repo.owner}/</span>
            {repo.name}
          </Link>
          {isFresh ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-signal">new</span>
          ) : null}
        </h3>
        {repo.description ? (
          <p className={compact ? "mt-1 line-clamp-1 text-[13px] leading-relaxed text-ink-2" : "mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2"}>
            {repo.description}
          </p>
        ) : null}
        <TopicLine topics={repo.topics} />
      </div>

      <div className="flex items-start gap-5 sm:gap-7">
        {showTrend ? (
          <span className="hidden pt-0.5 sm:block">
            <Sparkline points={modeledSeries(repo)} width={72} height={24} modeled />
          </span>
        ) : null}
        <div className="text-right">
          <p className="tnum flex items-baseline justify-end gap-1 text-[15px] leading-none text-ink">
            {formatCompact(repo.stars)}
            <span className="text-[10px] text-muted">★</span>
          </p>
          <p className="tnum mt-1.5 font-mono text-[10px] leading-none text-signal-ink">
            {repo.starsPerDay >= 0.1 ? `${repo.starsPerDay.toFixed(repo.starsPerDay >= 10 ? 0 : 1)}/day` : "slow"}
          </p>
          <p className="mt-1.5 font-mono text-[10px] uppercase leading-none tracking-[0.05em] text-muted">
            {repo.language ?? "mixed"}
          </p>
          {isFresh ? (
            <p className="mt-1.5 font-mono text-[10px] leading-none text-muted">{timeAgo(repo.createdAt)}</p>
          ) : null}
        </div>
        <ArrowUpRight
          className="mt-0.5 hidden size-3.5 text-line-strong transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink sm:block"
          aria-hidden
        />
      </div>
    </article>
  );
}

export function RepoRowList({ repos, startRank = 1 }: { repos: Repo[]; startRank?: number }) {
  return (
    <div className="border-b border-line">
      {repos.map((repo, index) => (
        <RepoRow key={repo.id} repo={repo} rank={startRank + index} />
      ))}
    </div>
  );
}
