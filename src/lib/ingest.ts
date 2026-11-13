import { getDb } from "../db/client";
import { getAllForScoring, insertSnapshot, setMeta, upsertRepo } from "../db/queries";
import {
  buildAndSaveDigest,
  computeVelocities,
  fillEmbeddings,
  fillSummaries,
  scoreAllRepos,
} from "./pipeline";
import {
  daysAgoIso,
  fetchReadme,
  searchRepositories,
  sleep,
  toRepoUpsert,
  type GitHubSearchItem,
} from "./github";

const SPAM_NAME =
  /^(awesome|awesome-|free-|best-|top-|interview|build-your-own|system-design|cheat|roadmap)/i;

export type IngestOptions = {
  /** Limit the number of GitHub search queries (useful for smoke tests). */
  maxQueries?: number;
  /** How many promising newcomers get a README fetch. */
  readmeLimit?: number;
  /** How many repos get fresh summaries / embeddings during this run. */
  summaryLimit?: number;
  embeddingLimit?: number;
  /** Build the weekly digest at the end. */
  buildDigest?: boolean;
};

export type IngestResult = {
  queries: number;
  discovered: number;
  readmes: number;
  velocities: number;
  summaries: number;
  embeddings: number;
  digestId: number | null;
  durationMs: number;
};

export function ingestQueries(): string[] {
  return [
    `created:>=${daysAgoIso(14)} stars:>=10`,
    `created:>=${daysAgoIso(45)} stars:>=50`,
    `pushed:>=${daysAgoIso(2)} stars:>=100`,
    `topic:ai-agents created:>=${daysAgoIso(120)} stars:>=20`,
    `topic:mcp created:>=${daysAgoIso(120)} stars:>=20`,
    `topic:llm created:>=${daysAgoIso(120)} stars:>=80`,
    `topic:rag created:>=${daysAgoIso(120)} stars:>=30`,
    `topic:developer-tools pushed:>=${daysAgoIso(7)} stars:>=300`,
    `topic:self-hosted pushed:>=${daysAgoIso(7)} stars:>=500`,
    `topic:cli created:>=${daysAgoIso(180)} stars:>=100`,
    `topic:rust created:>=${daysAgoIso(180)} stars:>=80`,
    `topic:database pushed:>=${daysAgoIso(7)} stars:>=500`,
    `topic:automation pushed:>=${daysAgoIso(14)} stars:>=200`,
    `topic:computer-vision created:>=${daysAgoIso(180)} stars:>=50`,
    `topic:typescript created:>=${daysAgoIso(180)} stars:>=100`,
    `topic:python created:>=${daysAgoIso(180)} stars:>=100`,
  ];
}

export async function runIngest(options: IngestOptions = {}): Promise<IngestResult> {
  const started = Date.now();
  const hasToken = Boolean(process.env.GITHUB_TOKEN?.trim());
  const pause = hasToken ? 2200 : 6500;
  const list = ingestQueries().slice(0, options.maxQueries ?? undefined);
  const found = new Map<number, GitHubSearchItem>();

  for (let i = 0; i < list.length; i++) {
    const query = list[i];
    try {
      const response = await searchRepositories(query, { sort: "stars", perPage: 100 });
      for (const item of response.items) {
        if (item.fork || item.archived || !item.description) continue;
        if (SPAM_NAME.test(item.name)) continue;
        if (!found.has(item.id)) found.set(item.id, item);
      }
    } catch (error) {
      console.warn(`Ingest query failed: ${(error as Error).message}`);
    }
    if (i < list.length - 1) await sleep(pause);
  }

  const items = [...found.values()];
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const tx = db.transaction((rows: GitHubSearchItem[]) => {
    for (const item of rows) upsertRepo(toRepoUpsert(item));
  });
  tx(items);

  const newcomers = items
    .filter((item) => {
      const age = Math.max(1, (Date.now() - new Date(item.created_at).getTime()) / 86_400_000);
      return item.stargazers_count / age > 2;
    })
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, options.readmeLimit ?? 30);

  const readmes: { item: GitHubSearchItem; readme: string }[] = [];
  const queue = [...newcomers];
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) continue;
      const readme = await fetchReadme(item.full_name);
      if (readme) readmes.push({ item, readme });
      await sleep(150);
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const readmeTx = db.transaction(() => {
    for (const { item, readme } of readmes) upsertRepo(toRepoUpsert(item, readme));
  });
  readmeTx();

  const snapshotTx = db.transaction(() => {
    for (const repo of getAllForScoring()) insertSnapshot(repo.id, today, repo.stars);
  });
  snapshotTx();

  scoreAllRepos();
  const velocities = computeVelocities();
  const summaries = await fillSummaries(options.summaryLimit ?? 60);
  const embeddings = await fillEmbeddings(options.embeddingLimit ?? 600);
  const digestId = options.buildDigest === false ? null : await buildAndSaveDigest();

  setMeta("last_ingest_at", new Date().toISOString());

  return {
    queries: list.length,
    discovered: items.length,
    readmes: readmes.length,
    velocities,
    summaries,
    embeddings,
    digestId,
    durationMs: Date.now() - started,
  };
}
