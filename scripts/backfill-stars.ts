/**
 * Backfills seven-day star deltas using the stargazers API (star timestamps).
 * Costs ~O(log n) requests per repo, but still needs a token to be practical.
 *
 * Usage: npm run backfill:stars -- 12
 */
import { getTopByStars, insertSnapshot } from "../src/db/queries";
import { computeVelocities } from "../src/lib/pipeline";
import { sleep, starsAtDate } from "../src/lib/github";

const requested = Number(process.argv[2] ?? 10);
const hasToken = Boolean(process.env.GITHUB_TOKEN?.trim());
const limit = hasToken ? requested : Math.min(requested, 5);

if (!hasToken) {
  console.warn("No GITHUB_TOKEN: unauthenticated core limit is 60 requests/hour, capping at 5 repos.");
}

const date = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
const today = new Date().toISOString().slice(0, 10);
const repos = getTopByStars(limit);

for (const repo of repos) {
  if (repo.stars < 100) continue;
  process.stdout.write(`${repo.fullName}… `);
  const historical = await starsAtDate(repo.fullName, date);
  if (historical === null) {
    console.log("failed");
    continue;
  }
  insertSnapshot(repo.id, date, historical);
  insertSnapshot(repo.id, today, repo.stars);
  console.log(`${repo.stars - historical} stars in 7d (${historical} → ${repo.stars})`);
  await sleep(hasToken ? 400 : 2500);
}

const updated = computeVelocities();
console.log(`Updated velocity for ${updated} repositories.`);
