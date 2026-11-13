import {
  getAllForScoring,
  getCounts,
  getFeed,
  getRecentDigestRepoIds,
  getReposMissingEmbedding,
  getReposMissingSummary,
  getSnapshotsSince,
  getStats,
  setDigestItems,
  setEmbedding,
  setSummary,
  updateScores,
  updateVelocity,
  upsertDigest,
} from "../db/queries";
import type { Repo } from "../types";
import { embedRepo } from "./embeddings";
import { generateDigestIntro, generateRepoNotes, heuristicNotes } from "./llm";
import { heatPercentiles, rawHeat } from "./scoring";
import { canonicalTopic } from "./topics";
import { isoWeek, weekStart } from "./utils";

export function scoreAllRepos(): number {
  const rows = getAllForScoring();
  const raw = rows.map((repo) => ({
    id: repo.id,
    raw: rawHeat(
      {
        stars: repo.stars,
        forks: repo.forks,
        createdAt: repo.createdAt,
        pushedAt: repo.pushedAt,
        quality: repo.quality,
        botScore: repo.botScore,
      },
      Date.now(),
    ),
  }));
  const heat = heatPercentiles(raw);
  const updates = rows.map((repo) => ({
    id: repo.id,
    heat: heat.get(repo.id) ?? 0,
    starsPerDay: Number((repo.stars / Math.max(1, (Date.now() - new Date(repo.createdAt).getTime()) / 86_400_000)).toFixed(3)),
  }));
  updateScores(updates);
  return updates.length;
}

export function computeVelocities(): number {
  const since = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
  const snapshots = getSnapshotsSince(since);
  if (!snapshots.length) return 0;

  const byRepo = new Map<number, { date: string; stars: number }[]>();
  for (const snap of snapshots) {
    const list = byRepo.get(snap.repoId) ?? [];
    list.push({ date: snap.date, stars: snap.stars });
    byRepo.set(snap.repoId, list);
  }

  const cutoff = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  let updated = 0;
  for (const [repoId, list] of byRepo) {
    const latest = list[list.length - 1];
    if (!latest) continue;
    const older = [...list].reverse().find((s) => s.date <= cutoff);
    if (!older) continue;
    updateVelocity(repoId, latest.stars - older.stars);
    updated++;
  }
  return updated;
}

export async function fillSummaries(limit = 250): Promise<number> {
  const repos = getReposMissingSummary(limit);
  let done = 0;
  for (const repo of repos) {
    const notes = await generateRepoNotes(repo);
    setSummary(repo.id, notes.summary, notes.whyNow, notes.buildIdea);
    done++;
  }
  return done;
}

export async function fillEmbeddings(limit = 2000): Promise<number> {
  const repos = getReposMissingEmbedding(limit);
  let done = 0;
  for (const repo of repos) {
    const { vector, model } = await embedRepo(repo);
    setEmbedding(repo.id, Buffer.from(new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength)), model);
    done++;
  }
  return done;
}

const TOPIC_PRIORITY = [
  "ai-agents",
  "mcp",
  "llm",
  "rag",
  "developer-tools",
  "self-hosted",
  "cli",
  "database",
  "automation",
  "computer-vision",
  "security",
  "rust",
  "typescript",
  "python",
  "webdev",
  "devops",
];

export function primaryTopic(repo: Repo): string {
  const normalized = repo.topics.map(canonicalTopic);
  for (const topic of TOPIC_PRIORITY) {
    if (normalized.includes(topic)) return topic;
  }
  return normalized[0] ?? "open-source";
}

function blurbFor(repo: Repo): string {
  const fallback = heuristicNotes(repo);
  return (repo.summary ?? fallback.summary).replace(/\s+/g, " ").trim();
}

export async function buildAndSaveDigest(week = isoWeek(new Date()), publish = true): Promise<number> {
  const rising = getFeed({ mode: "rising", limit: 60 }).repos;
  const gems = getFeed({ mode: "gems", limit: 20 }).repos;
  const recent = new Set(getRecentDigestRepoIds(week));
  const fresh = rising.filter((r) => !recent.has(r.id));
  const pool = fresh.length >= 12 ? fresh : rising;

  const picked: Repo[] = [];
  const used = new Set<number>();
  const perTopic = new Map<string, number>();

  const add = (repo: Repo) => {
    if (used.has(repo.id) || picked.length >= 12) return;
    used.add(repo.id);
    picked.push(repo);
  };

  for (const repo of pool) {
    if (picked.length >= 10) break;
    const topic = primaryTopic(repo);
    const count = perTopic.get(topic) ?? 0;
    if (count >= 2) continue;
    perTopic.set(topic, count + 1);
    add(repo);
  }
  for (const gem of gems) add(gem);

  if (picked.length < 6) {
    for (const repo of pool) add(repo);
  }

  const stats = getStats();
  const intro = await generateDigestIntro(
    week,
    picked.map((r) => ({
      name: r.fullName,
      summary: r.summary ?? heuristicNotes(r).summary,
      topics: r.topics,
    })),
    stats.repos,
  );

  const digestId = upsertDigest(week, intro.title, intro.intro, publish);
  setDigestItems(
    digestId,
    picked.map((repo, index) => ({
      repoId: repo.id,
      position: index + 1,
      blurb: blurbFor(repo),
    })),
  );
  return digestId;
}

export function pipelineSummary() {
  return {
    counts: getCounts(),
    stats: getStats(),
    weekStart: weekStart(),
    week: isoWeek(new Date()),
  };
}
