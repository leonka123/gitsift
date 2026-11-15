import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getCounts, getFeed, getLatestDigest, getStats, getTicker, getTopicCounts } from "@/db/queries";
import { formatCompact, isoWeek, repoHref, timeAgo, weekLabel } from "@/lib/utils";
import { prettyTopic } from "@/lib/topics";
import { ButtonLink, Eyebrow, SectionHeading, StatBlock } from "@/components/ui";
import { RepoRowList } from "@/components/repo-row";
import { RepoCard } from "@/components/repo-card";
import { Ticker } from "@/components/ticker";
import { SignalLegend, SignalMeter } from "@/components/signal-meter";

export const dynamic = "force-dynamic";

const POPULAR = [
  { label: "AI coding agent", query: "AI agent for coding" },
  { label: "Self-hosted analytics", query: "self-hosted analytics" },
  { label: "MCP for Postgres", query: "MCP server for Postgres" },
  { label: "Rust CLI", query: "Rust CLI for JSON" },
  { label: "Парсинг сайтов", query: "инструмент для парсинга сайтов" },
];

const METHOD = [
  {
    step: "01",
    title: "Discover",
    body: "Sixteen GitHub queries a day: fresh repos, fast movers, agent tooling, infrastructure. Forks, archives and list repos are dropped before scoring.",
  },
  {
    step: "02",
    title: "Score",
    body: "Momentum beats raw stars. Age, activity, stars per day and a quality prior produce a percentile — the signal scale you see on every row.",
  },
  {
    step: "03",
    title: "Filter",
    body: "Star spikes, empty READMEs, dead projects and SEO bait are penalised. A repo can be famous and still fail the bar.",
  },
  {
    step: "04",
    title: "Explain",
    body: "Each entry gets a plain-language summary, a factual reason to look now, and one weekend-sized thing to build with it.",
  },
];

export default function HomePage() {
  const stats = getStats();
  const counts = getCounts();
  const digest = getLatestDigest();
  const rising = getFeed({ mode: "rising", limit: 9 }).repos;
  const recent = getFeed({ mode: "new", limit: 6, windowDays: 7 });
  const fresh = recent.repos.length >= 5 ? recent.repos : getFeed({ mode: "new", limit: 6, windowDays: 30 }).repos;
  const gems = getFeed({ mode: "gems", limit: 5 }).repos;
  const topics = getTopicCounts(12);
  const ticker = getTicker(12);
  const week = weekLabel(isoWeek(new Date()));

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 grid-paper opacity-60" aria-hidden />
        <div className="page relative py-14 md:py-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-8">
              <div className="reveal flex flex-wrap items-center gap-3">
                <span className="inline-flex size-1.5 rounded-full bg-signal live-dot" aria-hidden />
                <Eyebrow>{week} · continuously updated</Eyebrow>
              </div>

              <h1 className="display reveal reveal-1 mt-6 text-[clamp(2.85rem,7.2vw,6.4rem)] text-ink">
                Find the repo
                <br />
                <span className="relative inline-block">
                  before it is obvious.
                  <span
                    className="absolute -bottom-1 left-0 h-[3px] w-[calc(100%-0.05em)] bg-signal"
                    aria-hidden
                  />
                </span>
              </h1>

              <p className="reveal reveal-2 mt-7 max-w-xl text-[15px] leading-relaxed text-ink-2 md:text-base">
                GitSift reads the GitHub firehose, drops the list repos and the bought stars, and
                ranks what is actually moving. New tools, rising projects, quiet compounds — with a
                reason to look now.
              </p>

              <form
                action="/search"
                className="reveal reveal-3 mt-8 flex max-w-2xl items-center border border-line-strong bg-cream/70 pl-4 focus-within:border-ink"
              >
                <label htmlFor="home-search" className="sr-only">
                  Describe what you are building
                </label>
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder="Describe what you are building…"
                  className="h-14 w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted"
                  maxLength={300}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="m-1.5 inline-flex h-11 shrink-0 items-center gap-2 bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-signal"
                >
                  Sift
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  Try
                </span>
                {POPULAR.map((item) => (
                  <Link
                    key={item.label}
                    href={`/search?q=${encodeURIComponent(item.query)}`}
                    className="border border-line px-2 py-1 font-mono text-[10px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <aside className="hidden lg:col-span-4 lg:block">
              <div className="border-l border-line pl-8">
                <Eyebrow>This week in numbers</Eyebrow>
                <dl className="mt-5 space-y-5">
                  {[
                    { value: formatCompact(stats.repos), label: "Repositories tracked" },
                    { value: formatCompact(stats.totalStars), label: "Stars in view" },
                    { value: String(stats.peak), label: "Peak-signal repos" },
                    { value: String(stats.languages), label: "Languages" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        {item.label}
                      </dt>
                      <dd className="tnum font-serif text-2xl leading-none">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                  {formatCompact(counts.snapshots)} snapshots collected
                </p>

                <div className="mt-6">
                  <Eyebrow>Signal scale</Eyebrow>
                  <div className="mt-3">
                    <SignalLegend />
                  </div>
                </div>

                {digest ? (
                  <Link href={`/digest/${digest.week}`} className="group mt-7 block border border-line bg-cream/50 p-4 transition-colors hover:border-line-strong">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-signal-ink">
                      Latest issue · {digest.week}
                    </p>
                    <p className="mt-2 font-serif text-lg leading-snug">{digest.title}</p>
                    <p className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 group-hover:text-ink">
                      Read the issue <ArrowUpRight className="size-3" aria-hidden />
                    </p>
                  </Link>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Ticker repos={ticker} />

      <section className="border-b border-line">
        <div className="page grid grid-cols-2 gap-8 py-8 md:grid-cols-4">
          <StatBlock value={formatCompact(stats.repos)} label="Repos in the index" hint="Filtered, not scraped wholesale." />
          <StatBlock value={formatCompact(stats.totalStars)} label="Stars represented" hint="Scale tells you what the ecosystem trusts." />
          <StatBlock value={String(stats.languages)} label="Languages" hint="Rust, Python, TypeScript and stranger things." />
          <StatBlock
            value={stats.updatedAt ? timeAgo(stats.updatedAt) : "today"}
            label="Last refresh"
            hint="Snapshots land daily; signals are recomputed every run."
          />
        </div>
      </section>

      {digest ? (
        <section className="page py-16 md:py-24">
          <SectionHeading
            eyebrow="The weekly issue"
            title="What moved this week"
            action={{ href: "/digest", label: "All issues" }}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-7">
              <p className="eyebrow text-signal-ink">{digest.week}</p>
              <h3 className="display mt-3 text-4xl leading-[1.02] md:text-5xl">{digest.title}</h3>
              {digest.intro ? (
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-2">{digest.intro}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <ButtonLink href={`/digest/${digest.week}`}>Read the issue</ButtonLink>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {digest.items.length} entries · edited by hand
                </span>
              </div>

              <div className="mt-9 border-t border-line pt-6">
                <div className="grid gap-6 sm:grid-cols-3">
                  {digest.items.slice(0, 3).map((item) => (
                    <Link key={item.repo.id} href={repoHref(item.repo.fullName)} className="group block">
                      <div className="flex items-center justify-between">
                        <span className="tnum font-mono text-[10px] text-muted">
                          {String(item.position).padStart(2, "0")}
                        </span>
                        <SignalMeter heat={item.repo.heat} />
                      </div>
                      <p className="mt-3 text-sm font-medium leading-snug group-hover:text-signal-ink">
                        {item.repo.fullName}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                        {item.repo.summary ?? item.repo.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-5">
              <div className="border-t border-line">
                {digest.items.slice(3, 6).map((item) => (
                  <RepoCard key={item.repo.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="page border-t border-line py-16 md:py-20">
        <SectionHeading
          eyebrow="The ledger"
          title="Rising right now"
          action={{ href: "/trending", label: "Full ranking" }}
          note="Ranked by signal: momentum, freshness, activity and a quality prior. Not by total stars."
        />
        <div className="mt-4">
          <RepoRowList repos={rising} />
        </div>
        <div className="mt-6 flex justify-end">
          <Link
            href="/trending"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
          >
            See the full ledger <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="page border-t border-line py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            <SectionHeading
              eyebrow="New arrivals"
              title="Just landed"
              action={{ href: "/new", label: "New this week" }}
            />
            <div className="mt-4">
              {fresh.length ? (
                fresh.map((repo) => (
                  <div key={repo.id} className="border-t border-line first:border-t-0">
                    <div className="py-4">
                      <Link href={repoHref(repo.fullName)} className="link-slide text-[15px] font-medium">
                        <span className="text-muted">{repo.owner}/</span>
                        {repo.name}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2">
                        {repo.description}
                      </p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                        {timeAgo(repo.createdAt)} · {formatCompact(repo.stars)}★ ·{" "}
                        {repo.starsPerDay.toFixed(1)}/day · {repo.language ?? "mixed"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-sm text-muted">Nothing new passed the bar this week. That happens.</p>
              )}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-5">
            <div className="border border-line bg-paper-2/50 p-6 md:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                <div>
                  <Eyebrow>Hidden gems</Eyebrow>
                  <h2 className="display mt-2 text-3xl">Quiet compounds</h2>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                  20–900★
                </span>
              </div>
              <div>
                {gems.map((repo) => (
                  <div key={repo.id} className="border-b border-line py-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={repoHref(repo.fullName)}
                          className="link-slide block truncate text-sm font-medium"
                        >
                          {repo.fullName}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                          {repo.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum font-mono text-[11px]">{formatCompact(repo.stars)}★</p>
                        <p className="tnum mt-1 font-mono text-[10px] text-signal-ink">
                          {repo.starsPerDay.toFixed(1)}/d
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/gems"
                className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
              >
                More hidden gems <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page border-t border-line py-16 md:py-20">
        <SectionHeading
          eyebrow="Index"
          title="Browse by topic"
          action={{ href: "/topics", label: "All topics" }}
        />
        <div className="mt-6 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.topic}
              href={`/topics/${encodeURIComponent(topic.topic)}`}
              className="group flex items-baseline justify-between gap-4 border-t border-line py-3.5 last:border-b sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <span className="text-sm text-ink-2 transition-colors group-hover:text-signal-ink">
                {prettyTopic(topic.topic)}
              </span>
              <span className="tnum font-mono text-[10px] text-muted">{topic.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-panel text-panel-ink">
        <div className="page py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="min-w-0 lg:col-span-5">
              <p className="eyebrow text-panel-ink/50">The method</p>
              <h2 className="display mt-4 text-4xl leading-[1.02] text-panel-ink md:text-5xl">
                Not a star
                <br />
                leaderboard.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-panel-ink/65">
                Total stars reward the past. GitSift ranks the present: how fast a project is moving
                relative to its age, whether the code is real, and whether anyone can use it.
              </p>
              <div className="mt-7">
                <SignalLegend tone="dark" />
              </div>
              <Link
                href="/about"
                className="mt-8 inline-flex items-center gap-2 border-b border-panel-ink/30 pb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-panel-ink/80 hover:border-panel-ink hover:text-panel-ink"
              >
                Read the full method <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            </div>

            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-7">
              {METHOD.map((item) => (
                <div key={item.step} className="border-t border-panel-ink/20 pt-4">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-signal">{item.step}</p>
                  <h3 className="mt-2 font-serif text-2xl text-panel-ink">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-panel-ink/60">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
