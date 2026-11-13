/**
 * One-off seed fetcher.
 *
 * Pulls a representative slice of the GitHub ecosystem (AI/agents + general
 * developer tooling), then grabs README excerpts for the most interesting
 * candidates so the app has real, readable content on first run.
 *
 * Usage: node scripts/fetch-seed.mjs
 * Requires no token. Unauthenticated search is limited to 10 req/min, so the
 * script paces itself and is intentionally slow.
 */

import fs from "node:fs/promises";
import path from "node:path";

const UA = "GitSift-seed/1.0 (+https://github.com/gitsift)";
const OUT_FILE = path.join(process.cwd(), "data", "seed", "repos.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 86_400_000).toISOString().slice(0, 10);

const QUERIES = [
  `created:>=${daysAgo(180)} stars:>=50`,
  `created:>=${daysAgo(30)} stars:>=20`,
  `pushed:>=${daysAgo(7)} stars:>=1000`,
  `topic:ai-agents created:>=${daysAgo(365)} stars:>=20`,
  `topic:mcp created:>=${daysAgo(365)} stars:>=20`,
  `topic:llm created:>=${daysAgo(365)} stars:>=100`,
  `topic:rag created:>=${daysAgo(365)} stars:>=30`,
  `topic:developer-tools stars:>=300`,
  `topic:self-hosted stars:>=500`,
  `topic:cli stars:>=2000`,
  `topic:rust created:>=${daysAgo(365)} stars:>=100`,
  `topic:database stars:>=1000`,
  `topic:automation stars:>=300`,
  `topic:computer-vision stars:>=300`,
  `topic:typescript stars:>=2000`,
  `topic:python stars:>=2000`,
  `topic:webdev stars:>=1000`,
  `topic:devops stars:>=1000`,
];

const SPAM_NAME = /^(awesome|awesome-|free-|best-|top-|cheat|interview)/i;
const SPAM_DESC =
  /(course|udemy|telegram|airdrop|giveaway|coupon|promo code|interview questions|leetcode solutions|assignment)/i;

async function gh(url, attempt = 0) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": UA },
  });
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset") || 0) * 1000;
    const wait = reset > Date.now() ? reset - Date.now() + 1500 : 15_000;
    if (attempt < 3) {
      console.log(`  rate limited, waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      return gh(url, attempt + 1);
    }
    throw new Error(`rate limited: ${url}`);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function cleanReadme(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 3000);
}

async function fetchReadme(fullName, attempt = 0) {
  for (const file of ["README.md", "readme.md"]) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${fullName}/HEAD/${file}`,
        { headers: { "User-Agent": UA } },
      );
      if (res.status === 429 && attempt < 2) {
        await sleep(2000 + attempt * 2000);
        return fetchReadme(fullName, attempt + 1);
      }
      if (res.ok) {
        const text = await res.text();
        return cleanReadme(text);
      }
    } catch {
      // network hiccup, try the next filename
    }
  }
  return null;
}

async function main() {
  const byId = new Map();
  console.log(`Fetching ${QUERIES.length} search pages…`);

  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    const url =
      "https://api.github.com/search/repositories?q=" +
      encodeURIComponent(q) +
      "&sort=stars&order=desc&per_page=100";
    try {
      const data = await gh(url);
      let added = 0;
      for (const item of data.items || []) {
        if (item.fork || item.archived) continue;
        if (!item.description) continue;
        if (SPAM_NAME.test(item.name) || SPAM_DESC.test(item.description)) continue;
        if (byId.has(item.id)) continue;
        byId.set(item.id, item);
        added++;
      }
      console.log(`  [${i + 1}/${QUERIES.length}] +${added} (total ${byId.size}) — ${q}`);
    } catch (err) {
      console.log(`  [${i + 1}/${QUERIES.length}] failed: ${err.message}`);
    }
    if (i < QUERIES.length - 1) await sleep(6500);
  }

  const repos = [...byId.values()].map((r) => {
    const ageDays = Math.max(1, (now - new Date(r.created_at)) / 86_400_000);
    return { raw: r, starsPerDay: r.stargazers_count / ageDays };
  });

  // READMEs for the most interesting 140 repos: high momentum first, then icons.
  const momentum = [...repos].sort((a, b) => b.starsPerDay - a.starsPerDay).slice(0, 90);
  const iconic = [...repos]
    .sort((a, b) => b.raw.stargazers_count - a.raw.stargazers_count)
    .slice(0, 50);
  const readmeIds = new Set([...momentum, ...iconic].map((x) => x.raw.id));

  console.log(`Fetching READMEs for ${readmeIds.size} repos…`);
  const withReadme = new Map();
  let n = 0;
  const queue = [...readmeIds];
  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      const entry = repos.find((x) => x.raw.id === id);
      if (!entry) continue;
      const text = await fetchReadme(entry.raw.full_name);
      if (text) withReadme.set(id, text);
      n++;
      if (n % 20 === 0) console.log(`  readmes ${n}/${readmeIds.size}`);
      await sleep(120);
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const output = repos.map(({ raw: r }) => ({
    id: r.id,
    full_name: r.full_name,
    owner: r.owner?.login ?? r.full_name.split("/")[0],
    owner_type: r.owner?.type ?? "User",
    owner_avatar: r.owner?.avatar_url ?? null,
    name: r.name,
    description: r.description,
    homepage: r.homepage || null,
    language: r.language || null,
    topics: r.topics || [],
    license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
    stars: r.stargazers_count,
    forks: r.forks_count,
    open_issues: r.open_issues_count,
    created_at: r.created_at,
    pushed_at: r.pushed_at,
    readme: withReadme.get(r.id) ?? null,
  }));

  output.sort((a, b) => b.stars - a.stars);

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(
    OUT_FILE,
    JSON.stringify(
      { generated_at: now.toISOString(), count: output.length, repos: output },
      null,
      2,
    ),
  );

  console.log(`\nWrote ${output.length} repos (${withReadme.size} with README) to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
