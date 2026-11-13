import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { DigestItem } from "@/types";
import { formatCompact, repoHref } from "@/lib/utils";
import { SignalMeter } from "./signal-meter";

export function RepoCard({ item, large = false }: { item: DigestItem; large?: boolean }) {
  const { repo } = item;
  return (
    <article className="group grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_1fr] sm:gap-6">
      <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-4">
        <span
          className={
            large
              ? "display tnum text-5xl text-line-strong"
              : "display tnum text-4xl text-line-strong"
          }
        >
          {String(item.position).padStart(2, "0")}
        </span>
        <SignalMeter heat={repo.heat} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className={large ? "text-2xl font-medium tracking-[-0.01em]" : "text-xl font-medium"}>
            <Link href={repoHref(repo.fullName)} className="link-slide">
              <span className="text-muted">{repo.owner}/</span>
              {repo.name}
            </Link>
          </h3>
          <p className="tnum font-mono text-[11px] text-muted">
            {formatCompact(repo.stars)}★ · {repo.starsPerDay.toFixed(repo.starsPerDay >= 10 ? 0 : 1)}/day
            {repo.language ? ` · ${repo.language}` : ""}
          </p>
        </div>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
          {item.blurb ?? repo.summary ?? repo.description}
        </p>

        <div className="mt-4 grid gap-4 border-l border-line pl-4 sm:grid-cols-2">
          {repo.whyNow ? (
            <div>
              <p className="eyebrow">Why now</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{repo.whyNow}</p>
            </div>
          ) : null}
          {repo.buildIdea ? (
            <div>
              <p className="eyebrow">Weekend build</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{repo.buildIdea}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {repo.topics.slice(0, 4).map((topic) => (
            <Link
              key={topic}
              href={`/topics/${topic}`}
              className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted transition-colors hover:text-signal-ink"
            >
              {topic}
            </Link>
          ))}
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
          >
            GitHub <ArrowUpRight className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
