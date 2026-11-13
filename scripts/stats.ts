/** Quick sanity check for a fresh database: npm run stats */
import { getFeed, getStats, getTopicCounts, getLatestDigest, getCounts } from "../src/db/queries";
import { search } from "../src/lib/search";
import { formatCompact } from "../src/lib/utils";

const stats = getStats();
const counts = getCounts();
console.log("DATABASE");
console.log(`  repos: ${counts.repos}, snapshots: ${counts.snapshots}, digests: ${counts.digests}`);
console.log(`  tracked stars: ${formatCompact(stats.totalStars)}, languages: ${stats.languages}`);
console.log("");

console.log("RISING (top 10)");
for (const [i, repo] of getFeed({ mode: "rising", limit: 10 }).repos.entries()) {
  console.log(
    `  ${String(i + 1).padStart(2)}. ${repo.fullName.padEnd(42)} heat=${repo.heat.toFixed(1).padStart(5)} ` +
      `q=${repo.quality.toFixed(2)} ${formatCompact(repo.stars)}★ ${repo.starsPerDay.toFixed(1)}/d [${repo.topics.slice(0, 3).join(",")}]`,
  );
}
console.log("");

console.log("NEW (top 5)");
for (const repo of getFeed({ mode: "new", limit: 5, windowDays: 30 }).repos) {
  console.log(`  ${repo.fullName} — ${repo.createdAt.slice(0, 10)} — ${formatCompact(repo.stars)}★`);
}
console.log("");

console.log("GEMS (top 5)");
for (const repo of getFeed({ mode: "gems", limit: 5 }).repos) {
  console.log(`  ${repo.fullName} — ${formatCompact(repo.stars)}★ — ${repo.starsPerDay.toFixed(1)}/d`);
}
console.log("");

console.log("TOPICS");
console.log(
  "  " +
    getTopicCounts(12)
      .map((t) => `${t.topic}(${t.count})`)
      .join("  "),
);
console.log("");

const digest = getLatestDigest();
console.log(`DIGEST ${digest?.week}: ${digest?.title}`);
digest?.items.forEach((item, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. ${item.repo.fullName}`);
});

for (const query of ["ai agent for coding", "self-hosted analytics", "инструмент для парсинга сайтов"]) {
  const response = await search(query, { limit: 5 });
  console.log("");
  console.log(`SEARCH "${query}" (${response.mode}, ${response.tookMs}ms)`);
  for (const result of response.results) {
    console.log(
      `  ${result.repo.fullName.padEnd(40)} q=${result.repo.quality.toFixed(2)} ` +
        `matched=[${result.matched.join(",")}] ${result.reason ?? ""}`,
    );
  }
}
