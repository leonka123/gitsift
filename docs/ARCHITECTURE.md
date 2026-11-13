# Architecture

GitSift is a single Next.js application with a local SQLite database. There is no queue, no
external search service, and no required third-party API. That is a deliberate constraint: the
project should be useful on a laptop, a $5 VPS, or a single Fly Machine with a volume.

## System shape

```
┌────────────────────┐
│  GitHub REST API   │
│  search + repos    │
└─────────┬──────────┘
          │  sixteen queries, READMEs, metadata
          ▼
┌─────────────────────────────────────────────────────┐
│                    ingest.ts                        │
│  dedupe → filter → upsert → snapshot → score        │
└─────────┬───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│              SQLite (WAL + FTS5)                    │
│  repos · star_snapshots · repos_fts · digests       │
│  digest_items · search_queries · meta               │
└──────┬───────────────────────────┬──────────────────┘
       │                           │
       ▼                           ▼
  queries.ts                  search.ts
  feeds, stats, digest        FTS + vectors + RRF
       │                           │
       └─────────────┬─────────────┘
                     ▼
              Next.js routes / RSC
```

The app is rendered dynamically (`export const dynamic = "force-dynamic"` on data pages) because
the database changes under it. There is no ISR cache to invalidate.

## Data model

`repos` is the center of gravity. It stores GitHub metadata, derived quality and signal fields,
generated notes, and a nullable embedding blob. `topics` is a JSON array; `topics_text` is its
space-joined mirror for FTS.

`star_snapshots` has one row per repo per day (`repo_id`, `captured_on`, `stars`). The unique key
makes re-running an ingest idempotent. Velocity needs at least two snapshots at least six days
apart, so a fresh install honestly reports "collecting" instead of inventing a trend.

`repos_fts` is an external-content-style FTS5 table maintained by insert/update/delete triggers on
`repos`. It indexes `full_name`, `description`, `summary` and `topics_text` with the `unicode61`
tokenizer and diacritic removal. Russian text is tokenized but not stemmed; query expansion covers
common Russian concepts.

`digests` + `digest_items` store a weekly edit. The digest is rebuilt from the top of the rising
ledger with a cap of two entries per primary topic, then topped up from hidden gems. Items carry a
stored blurb so a past issue stays stable if a repository description changes later.

`search_queries` is an aggregate-only log (query text + filters + timestamp) used to improve the
synonym dictionary. No IP address, user agent or user identifier is stored.

Migrations are append-only strings in `src/db/schema.ts`; `user_version` tracks the number applied.
The database is created automatically on first use.

## Ingestion

`src/lib/ingest.ts` runs sixteen GitHub search queries:

- fresh repos (14 and 45 days),
- recently pushed repos,
- topic-specific slices for AI agents, MCP, LLMs, RAG, developer tools, self-hosted, CLI, Rust,
  databases, automation, computer vision, TypeScript and Python.

Before insertion it drops forks, archived repos, repos without a description, and obvious
`awesome-*` / list / interview-prep names. Results are deduped by GitHub id. The top newcomers get a
README fetch, capped to keep an unauthenticated run inside the rate limit.

The pipeline then:

1. Upserts metadata and records a `star_snapshots` row for today.
2. Recomputes quality, bot score and stars/day for every repo (`scoreAllRepos`).
3. Computes 7-day velocity when enough snapshots exist.
4. Fills missing summaries (LLM if configured, deterministic heuristics otherwise).
5. Fills missing embeddings.
6. Rebuilds the current weekly digest.

`runIngest()` is shared by `scripts/ingest.ts` and `POST /api/cron/ingest`. The route requires
`Authorization: Bearer $CRON_SECRET`; it is the only mutating endpoint.

### Rate limits

| Mode | GitHub limit | Typical pause between queries |
| --- | --- | --- |
| No token | 60 requests/hour | 6.5s |
| `GITHUB_TOKEN` | 5,000 requests/hour | 2.2s |

One run uses roughly 16 search requests plus up to 60 README requests. READMEs are only fetched for
promising repos that do not already have one.

## Quality and bot score

`assessQuality()` is a bounded heuristic prior. It rewards a license, a real description, topics,
stars, forks, recent pushes, README depth and organization ownership. It penalises list repos,
course/SEO descriptions, Telegram spam in READMEs, archives and forks.

`botScore` is a separate 0–1 signal:

- > 800 stars/day → +0.55
- > 300 stars/day → +0.35
- > 1,000 stars with < 5 forks and no push in 30 days → +0.20
- < 3 days old with > 1,500 stars → +0.25

A repo can be famous and still score badly. Repos with quality below the feed floor never appear in
the ledger, regardless of stars.

## Signal

`rawHeat()` combines five normalised components:

```text
momentum  = clamp(log1p(starsPerDay * 7) / log1p(7 * 900))
scale     = clamp(log10(stars + 1) / 5.5)
freshness = clamp(1 - ageDays / 1100)
activity  = clamp(1 - pushAge / 120)
quality   = clamp(quality)

raw = 0.50 * momentum
    + 0.16 * scale
    + 0.14 * freshness
    + 0.10 * activity
    + 0.24 * quality

raw = raw * (0.55 + 0.45 * (1 - botScore))
```

`heatPercentiles()` converts raw values to 0–100 across all tracked repos. The UI buckets the
percentile into five labels: quiet, warming, rising, strong, peak. Percentiles are stable as the
index grows; raw values are not comparable between runs.

## Search

`search()` is hybrid and degrades in stages:

1. **Parse.** `parseQuery()` normalises the query, extracts filters, and expands concepts with an
   English/Russian dictionary (agent → autonomous, orchestration, assistant; парсинг → scraping,
   crawler, extraction).
2. **Lexical.** FTS5 BM25 over the expanded tokens, prefixed with `*` for partial words. A LIKE
   fallback catches short or unusual tokens that FTS misses.
3. **Semantic.** Embed the expanded query and compare against the cached repo vectors with cosine
   similarity. The default model is a 384-dimensional lexical hash (`hash-384-v1`); OpenAI
   embeddings can be enabled with `EMBEDDINGS_PROVIDER=openai`.
4. **Fuse.** Reciprocal rank fusion combines lexical and vector rankings. RRF is used instead of
   weighted score addition because BM25 and cosine are not on the same scale.
5. **Rerank.** If an LLM key is configured, the top candidates are sent to the model with
   instructions to pick the best fits and write a one-line reason. A rerank that returns fewer than
   three valid results is discarded.
6. **Explain.** Each result carries matched terms and a warning (stale, no license, unusual star
   growth, very small project).

The vector cache is process-global and refreshed every 60 seconds, keyed by embedding model. A
search over 1.2k repos is typically 40–120 ms on a laptop. The design stays acceptable to roughly
50k repos; beyond that, move vectors to sqlite-vec or a dedicated service.

## Reading surfaces

- `/` — editorial home: hero, weekly issue teaser, rising ledger, new arrivals, gems, topics.
- `/trending` — full signal-ranked feed with JSON export.
- `/new` — creation-window feed (7/30/90 days).
- `/gems` — 20–900 stars and at least 1.5 stars/day.
- `/topics` + `/topics/[slug]` — canonical topic index.
- `/search` — natural-language search with filters.
- `/repo/[owner]/[name]` — repo detail, quality checklist, modeled trajectory, similar repos.
- `/digest` + `/digest/[week]` — weekly issues.
- `/about` — the method, formulas and limitations.
- `/api/repos`, `/api/search`, `/api/og`, `/rss.xml`, `/sitemap.xml`, `/robots.txt`.

## Failure modes and tradeoffs

- **SQLite is a single-writer database.** Ingestion should run on one machine. Reads are concurrent
  and WAL keeps the site responsive during a refresh.
- **The default embeddings are lexical.** They are fast and offline, but they will not connect a
  metaphor to a repository. This is the main quality gap versus a hosted vector model.
- **The seed snapshot is not live.** It is real GitHub metadata captured for the demo. Run ingestion
  with a token for current data.
- **Velocity needs history.** A new install reports modeled trajectories until daily snapshots
  accumulate. The UI labels modeled lines instead of pretending they are measured.
- **The digest is opinionated.** It is built from the rising ledger, not from a human reading every
  README. The "why now" and "weekend build" notes are constrained by the available metadata.

## Extending it

- **New source query:** add it to `ingestQueries()` and document the niche.
- **New retrieval signal:** add a candidate generator in `search.ts` and fuse it with RRF.
- **Better embeddings:** implement the provider in `src/lib/embeddings.ts`; the rest of the pipeline
  is model-agnostic.
- **New page:** query through `src/db/queries.ts` instead of embedding SQL in components.
- **Postgres:** the schema is ordinary SQL; the main work is replacing FTS5 with `tsvector` and the
  vector cache with pgvector.
