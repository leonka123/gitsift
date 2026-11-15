# Roadmap

GitSift ships as a working v0.1.0, not a demo shell. This page is the honest order of work — items
move up when someone needs them, and nothing here is a promise of a date.

## Shipped in 0.1.0

- Ingestion from sixteen GitHub search queries, with snapshots and README enrichment.
- Momentum-based signal score, percentile ranking, bot and quality heuristics.
- Rising / New / Hidden gems feeds, topic pages, repository pages with sparklines and neighbours.
- Hybrid search (FTS5 + embeddings + RRF) with English/Russian concept expansion.
- Weekly digest with per-entry "why now" and "weekend build" notes, plus RSS.
- Public JSON API, OG images, sitemap, robots.
- Light and dark themes, responsive down to 320px, keyboard and screen-reader passes.
- Docker and Fly.io deployment, CI, 31 unit tests.

## Next

1. **A hosted demo.** The single biggest gap: people want to click before they clone. A small VPS
   with a volume and a daily ingest is enough.
2. **More history.** The score gets steadier with every daily snapshot; the first month is modelled.
3. **Save a search.** A URL that remembers language, star floor and license, so a radar can be
   bookmarked instead of retyped.
4. **Topic coverage.** Broaden the concept dictionary for infrastructure, data and design tooling —
   today it leans toward AI/agents.
5. **Digest archive depth.** Backfill a few weeks so the archive is not one page.

## Later, if the project earns it

- Email delivery for the weekly issue (self-hosted, no tracking pixels).
- Personal radar: follow languages, topics or a star floor; get a rendered page or RSS feed.
- Pluggable vector store (pgvector, sqlite-vec) for people who already run Postgres.
- A `/compare` view: two repositories side by side on the same timeline.

## Non-goals

- Paid placement, sponsored rows, bought stars.
- Engagement bait, fake urgency, "AI-powered" as a personality.
- A login wall around public GitHub data.
- An LLM that invents numbers. Summaries may be written by a model; metrics never are.

## How to pick something up

Open an issue or comment on an existing one before starting. Small, self-contained changes —
aliases, heuristics, tests, accessibility fixes — can go straight to a pull request. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
