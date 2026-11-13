# GitSift

**Find the repo before it is obvious.**

GitSift is an open-source radar for new and rising GitHub repositories. It reads the public
firehose, filters the noise, and ranks what is actually moving — with a reason to look now.

[Русская версия](README.ru.md) · [Method](src/app/about/page.tsx) · [Architecture](docs/ARCHITECTURE.md) · [RSS route](src/app/rss.xml/route.ts)

![GitSift home page](docs/gitsift-home.jpg)

---

## Why another GitHub trending?

GitHub Trending is a black box sorted by raw stars. Star count rewards the past: a five-year-old
project with 80k stars can outrank a three-week-old tool that is adding 200 stars a day.

GitSift ranks the present:

- **Momentum, not magnitude.** Stars per day since creation, adjusted for age and scale.
- **Quality gates.** Forks, archives, empty READMEs, list repos and star spikes are penalised.
- **Plain-language reasons.** Every entry gets a summary, a factual "why now", and a weekend-sized
  build idea.
- **Search by intent.** Describe what you are building, in English or Russian, and get repositories
  that fit — not keyword matches.

The full ranking formula is on the [method page](src/app/about/page.tsx) and in
[`src/lib/scoring.ts`](src/lib/scoring.ts). No paid placement. No bought stars.

## What is inside

| Surface | What it does |
| --- | --- |
| **Rising** | The live signal-ranked ledger. Every repo carries a percentile score. |
| **New** | Projects created in the last 7, 30 or 90 days, ranked without star history to lean on. |
| **Hidden gems** | 20–900 stars, at least 1.5 stars/day, still small enough to matter. |
| **Semantic search** | Hybrid FTS5 + embeddings + reciprocal rank fusion, with English/Russian concept expansion. |
| **Weekly issue** | A 12-entry edit with "why now" and "weekend build" notes, published as RSS. |
| **Public API** | The same data the UI uses, without authentication. |

## Quick start

Requirements: **Node.js 22+**. No database server, no Docker, no API keys.

```bash
git clone https://github.com/gitsift/gitsift.git
cd gitsift
npm install
npm run db:reset
npm run dev
```

Open <http://localhost:3000>. The reset command loads the bundled 1,240-repo seed slice, scores it,
writes summaries and embeddings, and builds the current weekly issue. It takes under a minute on a
laptop.

> The seed is a real snapshot of public GitHub metadata, included so the demo works offline. It is
> not a live mirror. Run the ingestion pipeline to refresh it.

### Docker

```bash
docker build -t gitsift .
docker run --rm -p 3000:3000 -v gitsift-data:/app/data gitsift
```

The image ships with a seeded database on first boot; the named volume keeps later ingests.

## Refresh from GitHub

```bash
cp .env.example .env
# GITHUB_TOKEN raises the API limit from 60/h to 5,000/h
npm run ingest
```

`npm run ingest` runs sixteen search queries, fetches READMEs for promising newcomers, records star
snapshots, recomputes signal, refreshes summaries and embeddings, and rebuilds the weekly issue.
Without a token it still works, just slowly.

### Schedule it

`POST /api/cron/ingest` is protected by `CRON_SECRET`:

```bash
curl -X POST https://gitsift.dev/api/cron/ingest \
  -H "Authorization: Bearer $CRON_SECRET"
```

The included GitHub Actions workflow (`.github/workflows/ingest.yml`) calls it daily. Any scheduler
works: Fly Machines, Vercel Cron, a systemd timer, or a cron job on the same box.

## Environment

Copy `.env.example` to `.env`. Everything is optional for local development.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `./data/gitsift.db` | SQLite file. WAL mode is enabled automatically. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Canonical URL for sitemap, RSS and OG images. |
| `GITHUB_TOKEN` | — | Lifts the GitHub REST limit to 5,000 requests/hour. |
| `LLM_API_KEY` | — | Any OpenAI-compatible key. Enables LLM summaries, search reranking and digest intros. |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter, OpenAI, Groq, DeepSeek, Ollama, LM Studio… |
| `LLM_MODEL` | `google/gemini-2.5-flash` | Model name for the provider above. |
| `EMBEDDINGS_PROVIDER` | `hash` | `hash` is zero-dependency and offline; `openai` is better. |
| `OPENAI_API_KEY` | — | Required only for `EMBEDDINGS_PROVIDER=openai`. |
| `CRON_SECRET` | — | Bearer token for `POST /api/cron/ingest`. |

GitSift is designed to degrade gracefully:

- Without `GITHUB_TOKEN`, ingestion is rate-limited but functional.
- Without an LLM key, summaries use a deterministic heuristic writer.
- Without OpenAI, embeddings use a local 384-dimensional lexical hashing model. Search stays fast
  and works offline; it will not understand a metaphor.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm start` | Run the production server. |
| `npm run db:reset` | Wipe and rebuild the seeded database. |
| `npm run ingest` | Refresh repositories from GitHub. |
| `npm run score` | Recompute signal percentiles. |
| `npm run summarize` | Fill missing summaries. |
| `npm run embed` | Fill missing embeddings. |
| `npm run digest` | Rebuild the current weekly issue. |
| `npm run pipeline` | Run ingest → score → summarize → embed → digest. |
| `npm run typecheck` | TypeScript check. |
| `npm test` | Unit tests (scoring, topics, embeddings, utils). |
| `node scripts/screenshots.mjs` | Visual QA with local Chrome/Edge. |

## API

No auth, no keys, cache-friendly.

```bash
# The rising ledger, 12 rows
curl "https://gitsift.dev/api/repos?mode=rising&limit=12"

# New Python repos from the last 30 days
curl "https://gitsift.dev/api/repos?mode=new&windowDays=30&language=Python&limit=12"

# Natural-language search
curl "https://gitsift.dev/api/search?q=self-hosted+analytics&limit=10"
```

Responses include the score, stars/day, topics, summary and GitHub URL. The README body is omitted;
the character count is included so clients can decide whether to fetch it.

## How it works

```
GitHub Search API ──► ingest ──► SQLite (WAL + FTS5)
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                       scoring              embeddings
                          │                     │
                          └──────────┬──────────┘
                                     │
                          feed · search · digest · RSS
```

The signal score is a percentile inside the current index:

```text
raw = 0.50 · momentum      // log1p(stars_per_day · 7)
    + 0.16 · scale         // log10(stars + 1)
    + 0.14 · freshness     // 1 - age_days / 1100
    + 0.10 · activity      // 1 - days_since_push / 120
    + 0.24 · quality       // heuristic prior, 0..1

signal = percentile(raw × (0.55 + 0.45 · trust))   // 0..100
trust  = 1 - bot_score
```

Percentiles are computed across every repository that passes ingestion, not only the ones shown in
a feed. A score of 99 means 99% of tracked repositories scored lower on the same day.

Search fuses two independent retrievals with reciprocal rank fusion:

1. **Lexical** — SQLite FTS5 BM25 over names, descriptions, topics and README excerpts.
2. **Semantic** — cosine similarity over 384-dimensional embeddings.

Query terms are expanded with a small English/Russian concept dictionary before retrieval. When an
LLM key is configured, the top candidates are reranked and each result gets a specific reason.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the schema, pipelines and deployment notes.

## Deploy

SQLite needs a persistent disk, so GitSift is not a good fit for a stateless serverless platform
without an external database. The included paths are:

- **Docker** on any host with a volume.
- **Fly.io** with a persistent volume (`fly.toml`).
- A small VPS with `npm run build && npm start` behind Caddy or nginx.

Set `NEXT_PUBLIC_SITE_URL` to the public origin and `CRON_SECRET` to a long random value before
exposing the app. The cron endpoint is the only mutating route.

See [docs/DEPLOY.md](docs/DEPLOY.md) for a step-by-step Fly.io runbook.

## Project structure

```
src/
  app/                 routes, metadata, OG images, RSS, API
  components/          editorial UI primitives and repo rows
  db/                  schema, migrations, typed queries
  lib/                 ingest, scoring, embeddings, search, LLM, digest
  types.ts             shared domain types
scripts/               seed, ingest, pipeline steps, visual QA
data/seed/repos.json   bundled 1,240-repo snapshot
docs/                  architecture, deployment, design direction
```

## Contributing

Issues and pull requests are welcome. Good first contributions:

- Add a topic alias or a Russian/English search expansion.
- Improve the anti-spam and bot heuristics with a failing example.
- Add a source query for an under-covered corner of the ecosystem.
- Improve accessibility or performance on a page you use.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a large PR. By participating you agree
to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT. See [LICENSE](LICENSE).

GitSift is not affiliated with GitHub. Repository data comes from the public GitHub API; rankings are
opinionated and computed, not endorsed by maintainers.
