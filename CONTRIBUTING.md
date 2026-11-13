# Contributing to GitSift

Thanks for looking. GitSift is a small, opinionated project: the goal is a useful radar, not a
feature checklist. The best contributions make the ranking or the reading experience measurably
better.

## Before you start

- **Open an issue first** for anything larger than a typo, a topic alias, or a test. It is easier to
  agree on the shape of a change before writing it.
- **One concern per pull request.** A scoring tweak and a redesign of the repo page should be two
  PRs.
- **Keep the UI in English.** The product is aimed at a global GitHub audience. Russian is supported
  in search, not in interface copy.
- **No growth hacks, paid placement, fake metrics or bought stars.** This is a hard rule.

## Development setup

```bash
npm install
npm run db:reset
npm run dev
```

Before opening a PR:

```bash
npm run typecheck
npm test
npm run build
```

If you touch a page, run the visual QA script and check desktop and mobile screenshots:

```bash
node scripts/screenshots.mjs
# output in .shots/report.json and .shots/*.png
```

The script uses a locally installed Chrome or Edge; it does not download a browser.

## What makes a good contribution

### Search quality

A good search PR includes a failing query, the expected result, and the reason the current ranking
misses it. Add a test in `src/lib/search.test.ts` or `src/lib/topics.test.ts` where possible.

Useful areas:

- Russian/English concept expansion (`src/lib/topics.ts`).
- Topic aliases that collapse near-duplicates.
- Ranking signals for exact-name and exact-topic matches.
- Stopword handling for noisy queries.

### Scoring and filtering

The formula is public in `src/lib/scoring.ts`. Changes need evidence, not taste:

- Show the old and new rank for a handful of real repositories.
- Explain which failure mode the change fixes.
- Keep the score bounded and stable across ingests.

### Sources

New GitHub search queries belong in `ingestQueries()` in `src/lib/ingest.ts`. Prefer precise queries
over broad ones, and document the corner of the ecosystem they cover. Forks, archived repos, repos
without descriptions and obvious list/SEO repos are filtered before scoring.

### UI

The design direction is **Editorial Swiss**: warm paper, ink, one vermilion accent, hairline rules,
asymmetric grids, no glassmorphism, no neon, no three identical cards. Read
[`docs/design-direction.md`](docs/design-direction.md) before restyling anything.

Accessibility is part of “done”:

- Keyboard reachable controls with visible focus.
- Meaningful `aria-label` on icon-only actions.
- No color-only information.
- No horizontal scroll at 390px.

## Commit messages

Conventional Commits are preferred:

```
feat(search): boost exact topic matches
fix(scoring): penalise star spikes older than 24h
docs: add Fly.io runbook
```

## Pull request checklist

- [ ] The change has a clear reason in the description.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] New behaviour is covered by a test or a screenshot.
- [ ] No secrets, tokens, database files or `.shots/` output are committed.

## Reporting bugs

Include:

- What you expected and what happened.
- The URL or a minimal query.
- Node version and whether you use the seed or a live ingest.
- The relevant server log line, if any.

Please do not paste API keys or full database files into an issue.

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Be direct about code,
generous with people.
