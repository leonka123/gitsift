import { getDb } from "./client";
import { assessQuality, computeRates } from "../lib/scoring";
import type {
  Digest,
  DigestWithItems,
  FeedMode,
  FeedResult,
  Repo,
  RepoRow,
  ShelfStats,
} from "../types";

function parseTopics(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function rowToRepo(row: RepoRow): Repo {
  return {
    id: row.id,
    fullName: row.full_name,
    owner: row.owner,
    name: row.name,
    description: row.description,
    homepage: row.homepage,
    language: row.language,
    topics: parseTopics(row.topics),
    license: row.license,
    stars: row.stars,
    forks: row.forks,
    openIssues: row.open_issues,
    createdAt: row.created_at,
    pushedAt: row.pushed_at,
    archived: Boolean(row.archived),
    isFork: Boolean(row.is_fork),
    ownerType: row.owner_type,
    ownerAvatar: row.owner_avatar,
    readme: row.readme,
    summary: row.summary,
    whyNow: row.why_now,
    buildIdea: row.build_idea,
    quality: row.quality,
    botScore: row.bot_score,
    starsPerDay: row.stars_per_day,
    heat: row.heat,
    velocity7d: row.velocity_7d,
    velocitySource: row.velocity_source === "snapshot" ? "snapshot" : "modeled",
    firstSeenAt: row.first_seen_at,
    lastSyncedAt: row.last_synced_at,
  };
}

export type FeedQuery = {
  mode: FeedMode;
  language?: string;
  topic?: string;
  topics?: string[];
  minStars?: number;
  limit?: number;
  offset?: number;
  windowDays?: number;
};

export function getFeed(query: FeedQuery): FeedResult {
  const db = getDb();
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 60);
  const offset = Math.max(query.offset ?? 0, 0);
  const where: string[] = [
    "quality >= 0.42",
    "bot_score < 0.45",
    "is_fork = 0",
    "archived = 0",
  ];
  const params: Record<string, unknown> = { limit: limit + 1, offset };

  if (query.mode === "rising") {
    where.push("date(pushed_at) >= date('now', '-60 days')");
    where.push("date(created_at) >= date('now', '-1095 days')");
  } else if (query.mode === "new") {
    where.push("date(created_at) >= date('now', :window)");
    params.window = `-${query.windowDays ?? 7} days`;
  } else if (query.mode === "gems") {
    where.push("stars between 20 and 900");
    where.push("stars_per_day >= 1.5");
    where.push("date(pushed_at) >= date('now', '-45 days')");
    where.push("date(created_at) >= date('now', '-400 days')");
  }

  if (query.language) {
    where.push("lower(language) = lower(:language)");
    params.language = query.language;
  }
  if (query.topic) {
    where.push("instr(' ' || topics_text || ' ', ' ' || lower(:topic) || ' ') > 0");
    params.topic = query.topic;
  }
  if (query.topics?.length) {
    const clauses: string[] = [];
    query.topics.forEach((topic, index) => {
      clauses.push(`instr(' ' || topics_text || ' ', ' ' || lower(:topic${index}) || ' ') > 0`);
      params[`topic${index}`] = topic;
    });
    where.push(`(${clauses.join(" or ")})`);
  }
  if (query.minStars && query.minStars > 0) {
    where.push("stars >= :minStars");
    params.minStars = query.minStars;
  }

  const order = query.mode === "top" ? "stars desc, heat desc" : "heat desc, stars desc";
  const rows = db
    .prepare(
      `select * from repos where ${where.join(" and ")} order by ${order} limit :limit offset :offset`,
    )
    .all(params) as RepoRow[];

  const hasMore = rows.length > limit;
  return { repos: rows.slice(0, limit).map(rowToRepo), hasMore };
}

export function getRepoByFullName(fullName: string): Repo | null {
  const row = getDb()
    .prepare("select * from repos where lower(full_name) = lower(?)")
    .get(fullName) as RepoRow | undefined;
  return row ? rowToRepo(row) : null;
}

export function getReposByIds(ids: number[]): Repo[] {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`select * from repos where id in (${placeholders})`)
    .all(...ids) as RepoRow[];
  const byId = new Map(rows.map((r) => [r.id, rowToRepo(r)]));
  return ids.map((id) => byId.get(id)).filter((r): r is Repo => Boolean(r));
}

export function getSnapshots(repoId: number): { date: string; stars: number }[] {
  return getDb()
    .prepare("select captured_on as date, stars from star_snapshots where repo_id = ? order by captured_on asc")
    .all(repoId) as { date: string; stars: number }[];
}

export function getTopicCounts(limit = 36): { topic: string; count: number }[] {
  return getDb()
    .prepare(
      `select trim(value) as topic, count(*) as count
       from repos, json_each(repos.topics)
       where quality >= 0.42 and bot_score < 0.45
       group by lower(trim(value))
       having count >= 2
       order by count desc, topic asc
       limit ?`,
    )
    .all(limit) as { topic: string; count: number }[];
}

export function getLanguages(limit = 20): { language: string; count: number }[] {
  return getDb()
    .prepare(
      `select language, count(*) as count from repos
       where language is not null and quality >= 0.42 and bot_score < 0.45
       group by language order by count desc limit ?`,
    )
    .all(limit) as { language: string; count: number }[];
}

export function getStats(): ShelfStats {
  const row = getDb()
    .prepare(
      `select count(*) as repos,
              sum(case when date(created_at) >= date('now', '-7 days') then 1 else 0 end) as new7d,
              sum(stars) as totalStars,
              count(distinct language) as languages,
              sum(case when heat >= 90 then 1 else 0 end) as peak,
              max(last_synced_at) as updatedAt
       from repos where quality >= 0.35`,
    )
    .get() as {
    repos: number;
    new7d: number | null;
    totalStars: number | null;
    languages: number | null;
    peak: number | null;
    updatedAt: string | null;
  };
  return {
    repos: row.repos ?? 0,
    new7d: row.new7d ?? 0,
    totalStars: row.totalStars ?? 0,
    languages: row.languages ?? 0,
    peak: row.peak ?? 0,
    updatedAt: row.updatedAt,
  };
}

export function getTicker(
  limit = 14,
): Pick<Repo, "fullName" | "heat" | "stars" | "createdAt">[] {
  return getDb()
    .prepare(
      `select full_name as fullName, heat, stars, created_at as createdAt from repos
       where quality >= 0.42 and bot_score < 0.45
       order by created_at desc, heat desc limit ?`,
    )
    .all(limit) as Pick<Repo, "fullName" | "heat" | "stars" | "createdAt">[];
}

export function getRepoEmbedding(repoId: number): { embedding: Buffer; model: string } | null {
  const row = getDb()
    .prepare("select embedding, embedding_model as model from repos where id = ? and embedding is not null")
    .get(repoId) as { embedding: Buffer; model: string } | undefined;
  return row ?? null;
}

export function getCandidateReposForSimilarity(): { id: number; embedding: Buffer }[] {
  return getDb()
    .prepare("select id, embedding from repos where embedding is not null")
    .all() as { id: number; embedding: Buffer }[];
}

export function getLatestDigest(): DigestWithItems | null {
  const db = getDb();
  const digest = db
    .prepare("select * from digests where published = 1 order by week desc limit 1")
    .get() as
    | { id: number; week: string; title: string; intro: string | null; published: number; created_at: string }
    | undefined;
  if (!digest) return null;
  return hydrateDigest(digest);
}

export function getDigestByWeek(week: string): DigestWithItems | null {
  const digest = getDb()
    .prepare("select * from digests where week = ?")
    .get(week) as
    | { id: number; week: string; title: string; intro: string | null; published: number; created_at: string }
    | undefined;
  if (!digest) return null;
  return hydrateDigest(digest);
}

function hydrateDigest(digest: {
  id: number;
  week: string;
  title: string;
  intro: string | null;
  published: number;
  created_at: string;
}): DigestWithItems {
  const rows = getDb()
    .prepare(
      `select di.position, di.blurb, r.*
       from digest_items di join repos r on r.id = di.repo_id
       where di.digest_id = ? order by di.position asc`,
    )
    .all(digest.id) as (RepoRow & { position: number; blurb: string | null })[];

  return {
    id: digest.id,
    week: digest.week,
    title: digest.title,
    intro: digest.intro,
    published: Boolean(digest.published),
    createdAt: digest.created_at,
    items: rows.map((row) => ({
      position: row.position,
      blurb: row.blurb,
      repo: rowToRepo(row),
    })),
  };
}

export function listDigests(limit = 12): Digest[] {
  const rows = getDb()
    .prepare(
      `select d.*, (select count(*) from digest_items di where di.digest_id = d.id) as item_count
       from digests d where d.published = 1 order by d.week desc limit ?`,
    )
    .all(limit) as {
    id: number;
    week: string;
    title: string;
    intro: string | null;
    published: number;
    created_at: string;
    item_count: number;
  }[];
  return rows.map((r) => ({
    id: r.id,
    week: r.week,
    title: r.title,
    intro: r.intro,
    published: Boolean(r.published),
    createdAt: r.created_at,
    itemCount: r.item_count,
  }));
}

export function getAllRepoPaths(limit = 500): { fullName: string; updatedAt: string }[] {
  return getDb()
    .prepare("select full_name as fullName, last_synced_at as updatedAt from repos order by stars desc limit ?")
    .all(limit) as { fullName: string; updatedAt: string }[];
}

// ── Writes ─────────────────────────────────────────────────────────────────

export type RepoUpsert = {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  createdAt: string;
  pushedAt: string | null;
  archived: boolean;
  isFork: boolean;
  ownerType: string | null;
  ownerAvatar: string | null;
  readme: string | null;
};

export function upsertRepo(input: RepoUpsert): void {
  const now = new Date().toISOString();
  const topics = input.topics.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const { quality, botScore } = assessQuality({
    description: input.description,
    license: input.license,
    topics,
    stars: input.stars,
    forks: input.forks,
    createdAt: input.createdAt,
    pushedAt: input.pushedAt,
    archived: input.archived,
    isFork: input.isFork,
    ownerType: input.ownerType,
    readme: input.readme,
    name: input.name,
  });
  const { starsPerDay } = computeRates(input.stars, input.createdAt);

  getDb()
    .prepare(
      `insert into repos (
         id, full_name, owner, name, description, homepage, language, topics, topics_text,
         license, stars, forks, open_issues, created_at, pushed_at, archived, is_fork,
         owner_type, owner_avatar, readme, quality, bot_score, stars_per_day,
         first_seen_at, last_synced_at
       ) values (
         @id, @fullName, @owner, @name, @description, @homepage, @language, @topics, @topicsText,
         @license, @stars, @forks, @openIssues, @createdAt, @pushedAt, @archived, @isFork,
         @ownerType, @ownerAvatar, @readme, @quality, @botScore, @starsPerDay,
         @now, @now
       )
       on conflict(id) do update set
         full_name = excluded.full_name,
         owner = excluded.owner,
         name = excluded.name,
         description = excluded.description,
         homepage = excluded.homepage,
         language = excluded.language,
         topics = excluded.topics,
         topics_text = excluded.topics_text,
         license = excluded.license,
         stars = excluded.stars,
         forks = excluded.forks,
         open_issues = excluded.open_issues,
         created_at = excluded.created_at,
         pushed_at = excluded.pushed_at,
         archived = excluded.archived,
         is_fork = excluded.is_fork,
         owner_type = excluded.owner_type,
         owner_avatar = excluded.owner_avatar,
         readme = coalesce(excluded.readme, repos.readme),
         quality = excluded.quality,
         bot_score = excluded.bot_score,
         stars_per_day = excluded.stars_per_day,
         last_synced_at = excluded.last_synced_at`,
    )
    .run({
      ...input,
      topics: JSON.stringify(topics),
      topicsText: topics.join(" "),
      archived: input.archived ? 1 : 0,
      isFork: input.isFork ? 1 : 0,
      quality,
      botScore,
      starsPerDay,
      now,
    });
}

export function updateScores(rows: { id: number; heat: number; starsPerDay: number }[]): void {
  const stmt = getDb().prepare("update repos set heat = ?, stars_per_day = ? where id = ?");
  const tx = getDb().transaction((items: typeof rows) => {
    for (const item of items) stmt.run(item.heat, item.starsPerDay, item.id);
  });
  tx(rows);
}

export function updateVelocity(repoId: number, velocity: number): void {
  getDb()
    .prepare("update repos set velocity_7d = ?, velocity_source = 'snapshot' where id = ?")
    .run(velocity, repoId);
}

export function setSummary(
  repoId: number,
  summary: string,
  whyNow: string,
  buildIdea: string,
): void {
  getDb()
    .prepare("update repos set summary = ?, why_now = ?, build_idea = ? where id = ?")
    .run(summary, whyNow, buildIdea, repoId);
}

export function setEmbedding(repoId: number, embedding: Buffer, model: string): void {
  getDb()
    .prepare("update repos set embedding = ?, embedding_model = ? where id = ?")
    .run(embedding, model, repoId);
}

export function getReposMissingSummary(limit = 200): Repo[] {
  const rows = getDb()
    .prepare(
      `select * from repos
       where (summary is null or summary = '') and quality >= 0.42 and bot_score < 0.45
       order by heat desc limit ?`,
    )
    .all(limit) as RepoRow[];
  return rows.map(rowToRepo);
}

export function getReposMissingEmbedding(limit = 500): Repo[] {
  const rows = getDb()
    .prepare(
      `select * from repos where embedding is null and quality >= 0.35 order by heat desc limit ?`,
    )
    .all(limit) as RepoRow[];
  return rows.map(rowToRepo);
}

export function getAllEmbeddings(model?: string): { id: number; embedding: Buffer }[] {
  if (model) {
    return getDb()
      .prepare("select id, embedding from repos where embedding is not null and embedding_model = ?")
      .all(model) as { id: number; embedding: Buffer }[];
  }
  return getDb()
    .prepare("select id, embedding from repos where embedding is not null")
    .all() as { id: number; embedding: Buffer }[];
}

export function insertSnapshot(repoId: number, date: string, stars: number): void {
  getDb()
    .prepare(
      "insert into star_snapshots (repo_id, captured_on, stars) values (?, ?, ?) on conflict(repo_id, captured_on) do update set stars = excluded.stars",
    )
    .run(repoId, date, stars);
}

export function getSnapshotBefore(repoId: number, date: string): number | null {
  const row = getDb()
    .prepare(
      "select stars from star_snapshots where repo_id = ? and captured_on <= ? order by captured_on desc limit 1",
    )
    .get(repoId, date) as { stars: number } | undefined;
  return row?.stars ?? null;
}

export function getSnapshotsSince(date: string): { repoId: number; date: string; stars: number }[] {
  return getDb()
    .prepare(
      "select repo_id as repoId, captured_on as date, stars from star_snapshots where captured_on >= ? order by captured_on asc",
    )
    .all(date) as { repoId: number; date: string; stars: number }[];
}

export function getAllForScoring(): {
  id: number;
  stars: number;
  forks: number;
  createdAt: string;
  pushedAt: string | null;
  quality: number;
  botScore: number;
}[] {  const rows = getDb()
    .prepare(
      "select id, stars, forks, created_at as createdAt, pushed_at as pushedAt, quality, bot_score as botScore from repos",
    )
    .all() as {
    id: number;
    stars: number;
    forks: number;
    createdAt: string;
    pushedAt: string | null;
    quality: number;
    botScore: number;
  }[];
  return rows;
}

export function getRecentDigestRepoIds(excludeWeek?: string): number[] {
  const rows = getDb()
    .prepare(
      `select distinct di.repo_id as id from digest_items di
       where di.digest_id in (
         select id from digests where (? is null or week != ?) order by week desc limit 2
       )`,
    )
    .all(excludeWeek ?? null, excludeWeek ?? null) as { id: number }[];
  return rows.map((r) => r.id);
}

export function getTopByStars(limit = 20): { id: number; fullName: string; stars: number }[] {
  return getDb()
    .prepare("select id, full_name as fullName, stars from repos order by stars desc limit ?")
    .all(limit) as { id: number; fullName: string; stars: number }[];
}

export function getMeta(key: string): string | null {
  const row = getDb().prepare("select value from meta where key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare("insert into meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value")
    .run(key, value);
}

export function upsertDigest(
  week: string,
  title: string,
  intro: string,
  published: boolean,
): number {
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    `insert into digests (week, title, intro, published, created_at)
     values (?, ?, ?, ?, ?)
     on conflict(week) do update set title = excluded.title, intro = excluded.intro,
       published = excluded.published, created_at = excluded.created_at`,
  ).run(week, title, intro, published ? 1 : 0, now);
  const row = db.prepare("select id from digests where week = ?").get(week) as { id: number };
  return row.id;
}

export function setDigestItems(
  digestId: number,
  items: { repoId: number; position: number; blurb: string }[],
): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("delete from digest_items where digest_id = ?").run(digestId);
    const stmt = db.prepare(
      "insert into digest_items (digest_id, repo_id, position, blurb) values (?, ?, ?, ?)",
    );
    for (const item of items) stmt.run(digestId, item.repoId, item.position, item.blurb);
  });
  tx();
}

export function logSearch(query: string, filters: string | null): void {
  getDb()
    .prepare("insert into search_queries (query, filters, created_at) values (?, ?, ?)")
    .run(query, filters, new Date().toISOString());
}

export function getRecentSearches(limit = 8): string[] {
  const rows = getDb()
    .prepare(
      "select query, count(*) as n from search_queries group by lower(query) order by n desc limit ?",
    )
    .all(limit) as { query: string }[];
  return rows.map((r) => r.query);
}

export function getCounts(): { repos: number; digests: number; snapshots: number } {
  const db = getDb();
  const repos = (db.prepare("select count(*) as n from repos").get() as { n: number }).n;
  const digests = (db.prepare("select count(*) as n from digests").get() as { n: number }).n;
  const snapshots = (db.prepare("select count(*) as n from star_snapshots").get() as { n: number }).n;
  return { repos, digests, snapshots };
}
