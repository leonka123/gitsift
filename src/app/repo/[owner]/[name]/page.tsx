import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, X } from "lucide-react";
import { getRepoByFullName, getSnapshots } from "@/db/queries";
import { getSimilarRepos } from "@/lib/similar";
import { signalWord, qualityFactors } from "@/lib/scoring";
import { formatCompact, formatDate, formatFull, repoHref, timeAgo, truncate } from "@/lib/utils";
import { prettyTopic } from "@/lib/topics";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { SignalMeter } from "@/components/signal-meter";
import { Sparkline, modeledSeries } from "@/components/sparkline";
import { ISSUES_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ owner: string; name: string }> };

async function loadRepo(params: Params["params"]) {
  const { owner, name } = await params;
  return getRepoByFullName(`${decodeURIComponent(owner)}/${decodeURIComponent(name)}`);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const repo = await loadRepo(params);
  if (!repo) return { title: "Repository not found" };
  const description = truncate(
    repo.summary ?? repo.description ?? `${repo.fullName} on GitHub — tracked by GitSift.`,
    180,
  );
  const ogTitle = `${repo.fullName} — ${formatCompact(repo.stars)} stars`;
  return {
    title: `${repo.fullName} — ${repo.language ?? "open-source"} repository`,
    description,
    alternates: { canonical: repoHref(repo.fullName) },
    openGraph: {
      title: repo.fullName,
      description,
      type: "article",
      images: [
        {
          url: `/api/og?eyebrow=${encodeURIComponent(
            `${repo.language ?? "Open source"} · signal ${Math.round(repo.heat)}/100`,
          )}&title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(
            truncate(description, 130),
          )}&meta=${encodeURIComponent(`${repo.starsPerDay.toFixed(1)} stars/day · ${repo.license ?? "no license"}`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#")) {
      const hex = code[1]?.toLowerCase() === "x";
      const value = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(value) && value > 0 ? String.fromCodePoint(value) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function stripInlineMarkdown(text: string): string {
  return decodeEntities(
    text
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
      .replace(/<\/?[a-z][^>]*>/gi, " ")
      .replace(/`{1,3}([^`\n]+)`{1,3}/g, "$1")
      .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, "$1")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "$1")
      .replace(/(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])/g, "$1"),
  )
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readmeParagraphs(readme: string | null): string[] {
  if (!readme) return [];
  const blocks = readme
    .replace(/```[\s\S]*?```/g, "\n\n")
    .replace(/<!--[\s\S]*?-->/g, "\n\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\|.*$/gm, "")
    .replace(/^\s*[-=]{3,}\s*$/gm, "")
    .split(/\n\s*\n/);

  const paragraphs: string[] = [];
  for (const block of blocks) {
    const text = stripInlineMarkdown(block);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (text.length < 60 || words < 8) continue;
    // Drop leftover table rows, navigation strips and badge soup.
    if ((text.match(/\|/g)?.length ?? 0) >= 2) continue;
    if (/\u00b7/.test(text) && words < 14) continue;
    paragraphs.push(text.length > 380 ? text.slice(0, 378).trimEnd() + "…" : text);
    if (paragraphs.length >= 4) break;
  }
  return paragraphs;
}

export default async function RepoPage({ params }: Params) {
  const repo = await loadRepo(params);
  if (!repo) notFound();

  const snapshots = getSnapshots(repo.id);
  const hasHistory = snapshots.length >= 2;
  const points = hasHistory
    ? snapshots.map((snapshot) => ({ date: snapshot.date, stars: snapshot.stars }))
    : modeledSeries(repo, 30);
  const delta = hasHistory
    ? points[points.length - 1].stars - points[0].stars
    : Math.round(repo.starsPerDay * 30);
  const similar = getSimilarRepos(repo, 4);
  const factors = qualityFactors(repo);
  const paragraphs = readmeParagraphs(repo.readme);
  const firstSeen = new Date(repo.firstSeenAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const summary = repo.summary?.trim();
  const description = repo.description?.trim();
  const summaryAddsDetail =
    Boolean(summary) &&
    !(
      description &&
      (normalize(summary!) === normalize(description) ||
        normalize(description).startsWith(normalize(summary!.replace(/…$/, ""))))
    );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: repo.name,
    description: repo.description,
    codeRepository: `https://github.com/${repo.fullName}`,
    programmingLanguage: repo.language ?? undefined,
    license: repo.license ? `https://spdx.org/licenses/${repo.license}.html` : undefined,
    dateCreated: repo.createdAt,
    dateModified: repo.pushedAt ?? undefined,
    author: { "@type": "Organization", name: repo.owner },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Math.round(repo.heat),
      bestRating: 100,
      ratingCount: Math.max(repo.stars, 1),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="page pt-8">
        <nav aria-label="Breadcrumb" className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          <Link href="/trending" className="hover:text-ink">
            Radar
          </Link>
          <span className="mx-2 text-line-strong">/</span>
          {repo.language ? (
            <>
              <Link href={`/new?window=90`} className="hover:text-ink">
                {repo.language}
              </Link>
              <span className="mx-2 text-line-strong">/</span>
            </>
          ) : null}
          <span className="text-ink-2">{repo.owner}</span>
        </nav>

        <header className="mt-6 grid gap-10 border-b border-line pb-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3">
              <SignalMeter heat={repo.heat} />
              <Eyebrow>
                Signal {Math.round(repo.heat)} · {signalWord(repo.heat)} · {repo.starsPerDay.toFixed(1)} stars/day
              </Eyebrow>
            </div>

            <h1 className="display mt-4 break-words text-[clamp(2.5rem,6vw,5rem)] leading-[0.95]">
              <span className="text-muted">{repo.owner}/</span>
              <wbr />
              {repo.name}
            </h1>

            {repo.description ? (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{repo.description}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.07em] text-muted">
              <span>{repo.language ?? "Unknown language"}</span>
              <span className="text-line-strong">·</span>
              <span>{repo.license ?? "No license"}</span>
              <span className="text-line-strong">·</span>
              <span>Created {formatDate(repo.createdAt)}</span>
              <span className="text-line-strong">·</span>
              <span>Last push {timeAgo(repo.pushedAt)}</span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`https://github.com/${repo.fullName}`} external>
                Open on GitHub
              </ButtonLink>
              {repo.homepage ? (
                <ButtonLink href={repo.homepage} variant="secondary" external>
                  Homepage
                </ButtonLink>
              ) : (
                <ButtonLink href="/search" variant="secondary">
                  Find similar
                </ButtonLink>
              )}
            </div>

            {repo.topics.length ? (
              <div className="mt-6 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                  Filed under
                </span>
                {repo.topics.slice(0, 8).map((topic) => (
                  <Link
                    key={topic}
                    href={`/topics/${topic}`}
                    className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.05em] text-ink-2 hover:border-ink hover:text-ink"
                  >
                    {prettyTopic(topic)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="lg:col-span-4">
            <div className="border border-line bg-paper-2/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Signal percentile</p>
                  <p className="tnum mt-2 font-serif text-6xl leading-none">{Math.round(repo.heat)}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-signal-ink">
                    {signalWord(repo.heat)}
                  </p>
                </div>
                <SignalMeter heat={repo.heat} className="mt-1" />
              </div>

              <dl className="mt-6 space-y-2.5 border-t border-line pt-4 text-[13px]">
                {[
                  { label: "Stars", value: formatFull(repo.stars) },
                  { label: "Forks", value: formatFull(repo.forks) },
                  { label: "Open issues", value: formatFull(repo.openIssues) },
                  { label: "Quality prior", value: `${Math.round(repo.quality * 100)} / 100` },
                  { label: "Stars per day", value: repo.starsPerDay.toFixed(2) },
                  { label: "License", value: repo.license ?? "No license" },
                  { label: "Owner", value: repo.ownerType === "organization" ? "Organization" : "User" },
                  { label: "Tracked since", value: firstSeen },
                ].map((fact) => (
                  <div key={fact.label} className="flex items-baseline justify-between gap-4 border-b border-line/70 pb-2 last:border-b-0 last:pb-0">
                    <dt className="text-muted">{fact.label}</dt>
                    <dd className="tnum font-mono text-xs text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>

            </div>
          </aside>
        </header>
      </div>

      <div className="page py-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <section
              className={`grid gap-8 border-b border-line pb-8 ${
                summaryAddsDetail ? "sm:grid-cols-2" : ""
              }`}
            >
              {summaryAddsDetail ? (
                <div>
                  <p className="eyebrow">What it is</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-2">{summary}</p>
                </div>
              ) : null}
              <div>
                <p className="eyebrow">Why it is here</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">
                  {repo.whyNow ?? "Tracked because it passed the quality floor and is moving."}
                </p>
              </div>
            </section>

            <section className="border-b border-line py-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Star trajectory</p>
                  <p className="mt-2 font-serif text-2xl">
                    {delta >= 0 ? "+" : ""}
                    {formatCompact(Math.abs(delta))} stars / 30 days
                  </p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.07em] text-muted">
                  {hasHistory ? `${snapshots.length} daily snapshots` : "modeled from average growth"}
                </p>
              </div>
              <div className="mt-5 border border-line bg-cream/40 p-4">
                <Sparkline
                  points={points}
                  width={720}
                  height={120}
                  modeled={!hasHistory}
                  accent
                  className="h-[120px] w-full"
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {hasHistory
                  ? `Real snapshots, first captured ${firstSeen}. Velocity is measured from daily star counts.`
                  : `This line extrapolates the average growth rate (${repo.starsPerDay.toFixed(
                      1,
                    )} stars/day). Real snapshots start the first day GitSift tracks the repo and accumulate daily.`}
              </p>
            </section>

            <section className="border-b border-line py-8">
              <p className="eyebrow">Weekend build</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">
                {repo.buildIdea ?? "Clone it, run the demo, and ship one small feature on top this weekend."}
              </p>
            </section>

            <section className="border-b border-line py-8">
              <div className="flex items-end justify-between gap-4">
                <p className="eyebrow">Quality checks</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.07em] text-muted">
                  {factors.filter((factor) => factor.ok).length} of {factors.length} passed
                </p>
              </div>
              <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                {factors.map((factor) => (
                  <li key={factor.label} className="flex items-center gap-2 border-b border-line/70 pb-2 text-[13px]">
                    {factor.ok ? (
                      <Check className="size-3.5 shrink-0 text-moss" aria-label="Passed" />
                    ) : (
                      <X className="size-3.5 shrink-0 text-signal" aria-label="Did not pass" />
                    )}
                    <span className={factor.ok ? "text-ink-2" : "text-muted"}>{factor.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="py-8">
              <div className="flex items-center justify-between gap-4">
                <p className="eyebrow">README · cleaned excerpt</p>
                <a
                  href={`https://github.com/${repo.fullName}#readme`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.07em] text-ink-2 hover:text-ink"
                >
                  Full README <ArrowUpRight className="size-3" aria-hidden />
                </a>
              </div>
              {paragraphs.length ? (
                <div className="mt-4 space-y-3.5 border-l border-line pl-5">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index} className="max-w-2xl text-[13px] leading-relaxed text-ink-2">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
                  No usable README was captured. That is itself a signal — check the repository before
                  investing a weekend.
                </p>
              )}
            </section>
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              {similar.length ? (
                <section className="border-t border-line pt-5">
                  <p className="eyebrow">Similar repositories</p>
                  <div className="mt-3">
                    {similar.map((item) => (
                      <Link
                        key={item.id}
                        href={repoHref(item.fullName)}
                        className="group block border-b border-line py-3 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium group-hover:text-signal-ink">
                              {item.fullName}
                            </p>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                              {item.description}
                            </p>
                          </div>
                          <SignalMeter heat={item.heat} label={false} className="mt-1 shrink-0" />
                        </div>
                        <p className="mt-1.5 font-mono text-[10px] text-muted">
                          {formatCompact(item.stars)}★ · {item.starsPerDay.toFixed(1)}/day
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="mt-8 border-t border-line pt-5">
                <p className="eyebrow">Found a problem?</p>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">
                  Rankings are computed, not curated. If a metric is stale or a project slipped through
                  the filter, open an issue — the scoring rules live in the repository.
                </p>
                <a
                  href={ISSUES_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 hover:text-ink"
                >
                  Report it <ArrowUpRight className="size-3" aria-hidden />
                </a>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
