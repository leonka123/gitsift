import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow } from "@/components/ui";
import { SignalLegend } from "@/components/signal-meter";

export const metadata: Metadata = {
  title: "Method",
  description:
    "How GitSift ranks repositories: the signal formula, quality gates, discovery queries, hybrid search, and the honest limitations of star-based discovery.",
  alternates: { canonical: "/about" },
  openGraph: {
    images: [
      {
        url: "/api/og?eyebrow=Method&title=Ranking%20is%20an%20opinion.%20Here%20is%20ours.&subtitle=The%20signal%20formula%2C%20the%20filters%2C%20and%20the%20limitations.",
        width: 1200,
        height: 630,
      },
    ],
  },
};

const RULES = [
  {
    number: "01",
    title: "Momentum over magnitude",
    body: "A repository is rewarded for stars per day since creation, not total stars. A three-week-old project adding 200 stars a day outranks a five-year-old project sitting on 80k. The logarithm keeps one viral launch from flattening the entire list.",
  },
  {
    number: "02",
    title: "Freshness over reputation",
    body: "Last push and project age are explicit terms. A famous repository with no commits in a year drops out of the rising ledger. Archives and forks never enter it.",
  },
  {
    number: "03",
    title: "Quality gates the feed",
    body: "A quality prior built from license, description, topics, forks, README depth and owner type is both a term and a gate. Below the floor, a repo cannot appear no matter how fast it grows.",
  },
  {
    number: "04",
    title: "Trust is a multiplier",
    body: "The bot score looks for impossible star velocity, huge star counts with almost no forks, and spam patterns. It never deletes a repo — it damps its signal and flags the anomaly in search results.",
  },
];

export default function AboutPage() {
  return (
    <>
      <header className="page border-b border-line pb-12 pt-12 md:pt-16">
        <Eyebrow>Method · last revised November 2026</Eyebrow>
        <h1 className="display mt-4 max-w-4xl text-[clamp(2.8rem,6.5vw,5.5rem)] leading-[0.96]">
          Ranking is an opinion.
          <br />
          Here is ours.
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-2 md:text-base">
          GitSift is a radar, not an oracle. It reads public GitHub metadata, filters what looks like
          noise, and ranks the rest by a formula you can inspect, reproduce and argue with. This page
          documents the whole thing — including the parts that do not work very well yet.
        </p>
      </header>

      <div className="page py-12">
        <div className="grid gap-10 border-b border-line pb-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">The signal scale</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Every rank is a percentile inside the current index, then bucketed into five readable
              steps. Percentiles are stable as the index grows; raw scores are not comparable across
              runs.
            </p>
            <div className="mt-5">
              <SignalLegend />
            </div>
          </div>
          <div className="lg:col-span-8">
            <pre className="overflow-x-auto border border-line bg-ink p-5 font-mono text-[11px] leading-relaxed text-paper/90">
{`raw = 0.50 · momentum       // log1p(stars_per_day · 7)
    + 0.16 · scale          // log10(stars + 1)
    + 0.14 · freshness      // 1 − age_days / 1100
    + 0.10 · activity       // 1 − days_since_push / 120
    + 0.24 · quality        // heuristic prior, 0…1

signal = percentile(raw × (0.55 + 0.45 · trust))   // 0…100
trust  = 1 − bot_score`}
            </pre>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Percentiles are computed across every repository that passes ingestion, not only the
              ones shown in a feed. This is why a signal score of 99 means something specific: 99% of
              tracked repositories scored lower on the same day.
            </p>
          </div>
        </div>

        <div className="mt-2">
          {RULES.map((rule) => (
            <section key={rule.number} className="grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10">
              <div className="flex items-baseline gap-3 lg:col-span-4">
                <span className="tnum font-mono text-[10px] text-signal-ink">{rule.number}</span>
                <h2 className="font-serif text-2xl leading-snug md:text-3xl">{rule.title}</h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-ink-2 lg:col-span-8">{rule.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-2 grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-2xl leading-snug md:text-3xl">What gets filtered</h2>
          </div>
          <div className="max-w-2xl text-sm leading-relaxed text-ink-2 lg:col-span-8">
            <p>
              Ingestion is intentionally lossy. A repository is dropped before it is ever scored if it
              is a fork, archived, has no description, or carries a name and description pattern
              typical of list repos, course funnels and interview-question farms.
            </p>
            <p className="mt-3">
              After scoring, the feeds require a quality score of at least 0.42 and a bot score below
              0.45. Around one in five tracked repositories fails that bar. Curated learning resources
              are penalised, not banned — some are excellent — but they do not belong in a feed about
              tools you can build on.
            </p>
            <p className="mt-3">
              This means GitSift will miss things. A brilliant repository with no description and no
              license will not surface until someone fixes the metadata. That is a real cost of the
              filter, and we prefer it to the alternative.
            </p>
          </div>
        </section>

        <section className="mt-2 grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-2xl leading-snug md:text-3xl">Where data comes from</h2>
          </div>
          <div className="max-w-2xl text-sm leading-relaxed text-ink-2 lg:col-span-8">
            <p>
              Public GitHub search and repository metadata, via the REST API. Each ingest runs sixteen
              targeted queries: very new repositories, fast movers, recently pushed projects, and topic
              sweeps across AI agents, MCP, LLMs, RAG, developer tools, self-hosted software, CLI,
              Rust, databases, automation, computer vision, TypeScript and Python.
            </p>
            <p className="mt-3">
              Star history is captured as a daily snapshot. When a repository has fewer than two
              snapshots, the sparkline is explicitly labelled as modelled from average growth — it is
              not scraped from a third party and it is not presented as measured history.
            </p>
            <p className="mt-3">
              READMEs are fetched from <span className="font-mono text-xs">raw.githubusercontent.com</span>,
              cleaned of badges and HTML, and truncated. Summaries, reasons and build ideas are written
              by the configured LLM when a key is present, and by deterministic heuristics when it is
              not. The app never requires a paid API key to function.
            </p>
          </div>
        </section>

        <section className="mt-2 grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-2xl leading-snug md:text-3xl">How search works</h2>
          </div>
          <div className="max-w-2xl text-sm leading-relaxed text-ink-2 lg:col-span-8">
            <p>
              Search is hybrid. SQLite FTS5 supplies BM25 keyword ranking; a 384-dimensional vector
              index supplies a semantic-ish signal; reciprocal rank fusion merges the two lists. Query
              terms are expanded through a small concept dictionary in English and Russian, and a
              lightweight Russian stemmer catches inflected forms.
            </p>
            <p className="mt-3">
              By default the embedding is a zero-dependency lexical hashing model — words, bigrams and
              character trigrams. It is honest about what it is: it catches shared vocabulary and
              related phrasing, not deep semantics. Setting{" "}
              <span className="font-mono text-xs">EMBEDDINGS_PROVIDER=openai</span> swaps in{" "}
              <span className="font-mono text-xs">text-embedding-3-small</span> without changing
              anything else.
            </p>
            <p className="mt-3">
              When an LLM key is configured, the top candidates are reranked and each result gets a
              short reason explaining why it fits the specific query. Without a key, results are ranked
              by fusion plus quality and signal; the interface says which mode produced the list.
            </p>
          </div>
        </section>

        <section className="mt-2 grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-2xl leading-snug md:text-3xl">Run it yourself</h2>
          </div>
          <div className="max-w-2xl lg:col-span-8">
            <p className="text-sm leading-relaxed text-ink-2">
              GitSift is a Next.js app with a local SQLite database. No external services are required
              for the demo. Clone, seed, run:
            </p>
            <pre className="mt-4 overflow-x-auto border border-line bg-ink p-5 font-mono text-[11px] leading-relaxed text-paper/90">
{`git clone https://github.com/gitsift/gitsift.git
cd gitsift
npm install
cp .env.example .env
npm run db:reset
npm run dev`}
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              For live ingestion, add a GitHub token and run the pipeline. A classic token with{" "}
              <span className="font-mono text-xs">public_repo</span> lifts the API limit from 60 to 5,000
              requests per hour. The app works without it; ingestion is just slower.
            </p>
            <pre className="mt-4 overflow-x-auto border border-line bg-paper-2/60 p-5 font-mono text-[11px] leading-relaxed text-ink-2">
{`GITHUB_TOKEN=ghp_...
npm run ingest        # discover, enrich, snapshot, score
npm run digest        # rebuild the current weekly issue
npm run pipeline      # all of the above, in order`}
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Deployment needs a persistent disk, not a serverless filesystem. A Dockerfile and Fly.io
              configuration are included; any host with a volume works.
            </p>
          </div>
        </section>

        <section className="mt-2 grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-2xl leading-snug md:text-3xl">Public API</h2>
          </div>
          <div className="max-w-2xl lg:col-span-8">
            <p className="text-sm leading-relaxed text-ink-2">
              The same data the pages use, without authentication. Please cache and be reasonable.
            </p>
            <pre className="mt-4 overflow-x-auto border border-line bg-paper-2/60 p-5 font-mono text-[11px] leading-relaxed text-ink-2">
{`# The ledger, 10 at a time
curl "https://gitsift.dev/api/repos?mode=rising&limit=10"

# New this week, Python only
curl "https://gitsift.dev/api/repos?mode=new&windowDays=7&language=Python"

# Natural-language search
curl "https://gitsift.dev/api/search?q=self-hosted%20analytics"`}
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Repositories are returned with their scores, dates, topics, summaries and GitHub URL. The
              README body is omitted; the character count is included.
            </p>
          </div>
        </section>

        <section className="mt-2 grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-2xl leading-snug md:text-3xl">Limitations</h2>
          </div>
          <div className="max-w-2xl text-sm leading-relaxed text-ink-2 lg:col-span-8">
            <ul className="space-y-3">
              <li className="flex gap-3 border-b border-line pb-3">
                <span className="font-mono text-[10px] text-signal-ink">01</span>
                <span>
                  Stars are a proxy for attention, and attention can be bought. The bot score catches
                  clumsy spikes, not sophisticated campaigns.
                </span>
              </li>
              <li className="flex gap-3 border-b border-line pb-3">
                <span className="font-mono text-[10px] text-signal-ink">02</span>
                <span>
                  The index is young. Rankings improve as daily snapshots accumulate; the first weeks
                  rely more heavily on the modelled trend.
                </span>
              </li>
              <li className="flex gap-3 border-b border-line pb-3">
                <span className="font-mono text-[10px] text-signal-ink">03</span>
                <span>
                  Discovery queries impose thresholds (stars, recency, topics). Quiet projects below
                  those thresholds are invisible until they move.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[10px] text-signal-ink">04</span>
                <span>
                  The default embedding is lexical, not neural. It is fast and free; it will not
                  understand a metaphor. Use OpenAI embeddings if that matters to you.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-10 grid gap-6 border border-line bg-paper-2/40 p-7 md:grid-cols-[1fr_auto] md:items-center md:p-9">
          <div>
            <p className="eyebrow">Open source, MIT</p>
            <h2 className="display mt-3 text-3xl md:text-4xl">Audit the formula. Break it. Send a patch.</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-2">
              The scoring code is a few hundred lines with unit-testable pure functions. If you think a
              weight is wrong, the issue tracker is open and the data is local.
            </p>
          </div>
          <a
            href="https://github.com/gitsift/gitsift"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-signal"
          >
            Open the repository
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-muted">
          GitSift stores search queries locally to improve ranking and show what people are looking
          for. There are no cookies, no third-party analytics and no telemetry. The hosted instance
          keeps aggregate query counts; the self-hosted instance keeps whatever you keep.{" "}
          <Link href="/search" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
            Try the search
          </Link>{" "}
          or{" "}
          <Link href="/trending" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
            read the ledger
          </Link>
          .
        </p>
      </div>
    </>
  );
}
