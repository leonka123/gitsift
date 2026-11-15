# Launch kit

Everything needed to put GitSift in front of people without sounding like a launch. The product is
the pitch; this page is only distribution mechanics.

## Positioning

**One line.** Find the repo before it is obvious.

**One paragraph.** GitSift is an open-source radar for new and rising GitHub repositories. It ranks
momentum instead of raw stars, filters out list repos and bought stars, and explains why each
project is worth ten minutes — with search that takes a description of the job, in English or
Russian.

**One tweet.** GitHub Trending rewards the past. GitSift ranks momentum: stars/day, age, activity,
quality. Every repo comes with a reason to look now. Self-hosted, MIT, no API keys.

## Before the first post

Repo settings:

- **Description:** `Open-source radar for new and rising GitHub repositories. Momentum, not star count. MIT, self-hosted, no API keys.`
- **Topics:** `github` `open-source` `discovery` `trending` `repositories` `developer-tools` `self-hosted` `nextjs` `sqlite` `search` `semantic-search` `ai-agents`
- **Social preview:** upload [`docs/social-preview.png`](social-preview.png) (1280×640).
- **Discussions:** on. The seed thread "What should GitSift track next?" already exists
  (`/discussions/1`); pin it and answer in public.
- **Issues:** labels `good first issue`, `help wanted`, `scoring`, `search`, `ui`.
- **Website:** the deployment URL once it exists.

Content:

- README renders correctly on GitHub (relative images, no broken links).
- One hosted URL exists, even a small one. `docker run` instructions are not a demo.
- The weekly issue has at least four backfilled weeks, so the archive does not look empty.
- A pinned issue explains the ranking and invites disagreement.

## Launch order

1. **Show HN** — Tuesday to Thursday, 08:00–10:00 US Eastern. Link the hosted demo, put the repo
   link in the first comment. Answer every technical thread for six hours.
2. **r/opensource and r/coolgithubprojects** — same day, different angle: the ranking formula and
   the anti-spam heuristics, not the UI.
3. **X / Bluesky / Mastodon** — one screenshot, one number, one link. No thread unless asked.
4. **dev.to / Hashnode** — a post called "Ranking GitHub by momentum instead of stars", with the
   formula, the failure modes and the benchmarks.
5. **Product Hunt** — only after the demo survives a normal day of traffic.

Do not post the same text everywhere. Hacker News punishes marketing; subreddits punish repetition;
X rewards a single strong visual.

## Draft: Show HN

> **Show HN: GitSift – an open-source radar for repos before they trend**
>
> GitHub Trending sorts by total stars, which mostly measures the past. I wanted a feed that answers
> "what is moving right now, and is it any good?" So I built GitSift: it ingests sixteen GitHub
> queries, records star snapshots, and ranks repositories by stars/day since creation, age, activity
> and a quality prior. Forks, archives, list repos and suspicious star spikes are filtered before
> scoring. Each entry gets a plain-language "why now".
>
> There is also semantic search: describe the job ("self-hosted analytics that works with Postgres")
> and it fuses FTS5 with embeddings, with English/Russian concept expansion.
>
> It is MIT, self-hosted, one Node process and a SQLite file. No API keys needed for the bundled
> 1,240-repo demo; a GitHub token only speeds up ingestion.
>
> Demo: <url> — Source: <repo>
>
> The formula is public in `src/lib/scoring.ts`, and I would genuinely like to hear which weights
> are wrong.

## Draft: technical post outline

1. Why total stars are a bad ranking signal (two concrete repos, same age, different trajectories).
2. The score: five terms, a percentile, a trust multiplier.
3. What gets filtered and why (star spikes, empty READMEs, list repos).
4. Hybrid search and reciprocal rank fusion, with the Russian query example.
5. Failure modes we already know about.
6. How to self-host in four commands.

## Reply playbook

- "How is this different from Trendshift / OSS Insight?" — Different input (momentum + quality), open
  code, self-hostable, intent search. Say what they do better: history and breadth.
- "Stars can be bought." — Agreed. That is what the bot score is for, and it is deliberately
  documented as imperfect.
- "Why not Postgres?" — SQLite keeps the clone-and-run path to one command. A pluggable store is on
  the roadmap.
- "The ranking is wrong for X." — Ask for the repo pair; if it is a real failure mode, open an issue
  with the labels `scoring` and `needs evidence`.

## After launch

- Publish the weekly issue on the same weekday, every week. Consistency is the compounding asset.
- Keep `good first issue` stocked with real, small tasks.
- Add every genuinely useful suggestion to `docs/ROADMAP.md` and credit the person.
- Watch referrers, clone counts and RSS subscriptions. Stars follow readers; readers follow a habit.
- Never buy stars, never trade them, never add a "star for a star" section. It is the fastest way to
  lose the only audience that matters.
