import { getAllEmbeddings, getReposByIds, logSearch } from "../db/queries";
import { getDb } from "../db/client";
import type { Repo, SearchResponse, SearchResult } from "../types";
import { cosine, embedText, embeddingFromBuffer } from "./embeddings";
import { llmAvailable, rerankSearch } from "./llm";
import { parseQuery, prettyTopic, type ParsedQuery } from "./topics";
import { daysSince } from "./scoring";
import { formatCompact } from "./utils";

type Ranked = { id: number; rank: number };

function loadVectorCache(model: string): { id: number; vec: Float32Array }[] {
  const key = `__gitsiftVectors_${model}`;
  const globalCache = globalThis as unknown as Record<string, { at: number; items: { id: number; vec: Float32Array }[] }>;
  const cached = globalCache[key];
  if (cached && Date.now() - cached.at < 60_000) return cached.items;

  const items = getAllEmbeddings(model).map((row) => ({
    id: row.id,
    vec: embeddingFromBuffer(row.embedding),
  }));
  globalCache[key] = { at: Date.now(), items };
  return items;
}

function ftsCandidates(parsed: ParsedQuery, limit = 120): Ranked[] {
  const tokens = [...new Set(parsed.expanded)]
    .map((t) => t.replace(/["*()]/g, "").trim())
    .filter((t) => t.length > 1)
    .slice(0, 24);
  if (!tokens.length) return [];
  const match = tokens.map((t) => `"${t}"*`).join(" OR ");
  try {
    const rows = getDb()
      .prepare(
        `select rowid as id from repos_fts where repos_fts match ? order by bm25(repos_fts) limit ?`,
      )
      .all(match, limit) as { id: number }[];
    return rows.map((r, i) => ({ id: r.id, rank: i + 1 }));
  } catch {
    return [];
  }
}

function likeCandidates(parsed: ParsedQuery, limit = 80): Ranked[] {
  const tokens = [...new Set(parsed.expanded)].slice(0, 6);
  if (!tokens.length) return [];
  const where = tokens.map(() => "(lower(description) like ? or lower(full_name) like ?)").join(" or ");
  const params = tokens.flatMap((t) => [`%${t.toLowerCase()}%`, `%${t.toLowerCase()}%`]);
  const rows = getDb()
    .prepare(
      `select id from repos where (${where}) and quality >= 0.36 and bot_score < 0.5
       order by heat desc limit ?`,
    )
    .all(...params, limit) as { id: number }[];
  return rows.map((r, i) => ({ id: r.id, rank: i + 1 }));
}

async function vectorCandidates(parsed: ParsedQuery, limit = 120): Promise<Ranked[]> {
  const text = [...parsed.expanded, parsed.raw].join(" ").trim();
  if (!text) return [];
  let vector: Float32Array;
  let model: string;
  try {
    const embedded = await embedText(text);
    vector = embedded.vector;
    model = embedded.model;
  } catch {
    return [];
  }
  const items = loadVectorCache(model).filter((item) => item.vec.length === vector.length);
  if (!items.length) return [];

  const scored = items
    .map((item) => ({ id: item.id, score: cosine(vector, item.vec) }))
    .filter((item) => item.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((item, i) => ({ id: item.id, rank: i + 1 }));
}

function matchedTerms(repo: Repo, parsed: ParsedQuery): string[] {
  const haystack = `${repo.fullName} ${repo.description ?? ""} ${repo.topics.join(" ")}`.toLowerCase();
  const hits = new Set<string>();
  for (const token of parsed.expanded) {
    if (token.length < 3) continue;
    if (haystack.includes(token)) {
      // Prefer the human topic label when the token is a topic.
      const topic = repo.topics.find((t) => t.includes(token) || token.includes(t));
      hits.add(topic ? prettyTopic(topic) : token);
    }
    if (hits.size >= 4) break;
  }
  return [...hits];
}

function warningFor(repo: Repo): string | undefined {
  const stale = daysSince(repo.pushedAt);
  if (stale > 365) return `No commits in over a year (last push ${Math.round(stale / 30)} months ago).`;
  if (!repo.license) return "No license declared — check before shipping it.";
  if (repo.botScore > 0.25) return "Star growth looks unusual; treat the numbers with care.";
  if (repo.stars < 25) return "Small project — promising, but early.";
  return undefined;
}

export async function search(
  query: string,
  options: {
    language?: string;
    license?: string;
    minStars?: number;
    limit?: number;
    selfHosted?: boolean;
  } = {},
): Promise<SearchResponse> {
  const started = Date.now();
  const trimmed = query.trim().slice(0, 300);
  if (!trimmed) {
    return { query: "", results: [], tookMs: 0, mode: "lexical" };
  }

  const parsed = parseQuery(trimmed);
  const fts = ftsCandidates(parsed);
  const [vec] = await Promise.all([vectorCandidates(parsed)]);
  const lexical = fts.length ? fts : likeCandidates(parsed);

  const fused = new Map<number, number>();
  const add = (items: Ranked[], weight: number) => {
    for (const item of items) {
      fused.set(item.id, (fused.get(item.id) ?? 0) + weight / (60 + item.rank));
    }
  };
  add(lexical, 1);
  add(vec, 1.1);

  const ids = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 160)
    .map(([id]) => id);

  let repos = getReposByIds(ids);

  const languageFilter = (options.language || parsed.language)?.toLowerCase();
  const licenseFilter = options.license || parsed.wantsLicense;
  const minStars = options.minStars ?? 0;
  const normLicense = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

  repos = repos.filter((repo) => {
    if (repo.archived || repo.isFork) return false;
    if (repo.quality < 0.36 || repo.botScore >= 0.5) return false;
    if (daysSince(repo.pushedAt) > 900) return false;
    if (languageFilter && (repo.language ?? "").toLowerCase() !== languageFilter) return false;
    if (minStars > 0 && repo.stars < minStars) return false;
    if (licenseFilter) {
      if (!normLicense(repo.license ?? "").includes(normLicense(licenseFilter))) return false;
    }
    return true;
  });

  const ranked = repos
    .map((repo) => {
      const base = fused.get(repo.id) ?? 0;
      const matched = matchedTerms(repo, parsed);
      const topicBoost = Math.min(matched.length, 3) * 0.035;
      const qualityBoost = repo.quality * 0.02 + (repo.heat / 100) * 0.02;
      const selfHostedBoost =
        options.selfHosted || parsed.selfHosted
          ? repo.topics.includes("self-hosted") || /docker|self[- ]hosted/i.test(`${repo.description ?? ""} ${repo.readme ?? ""}`)
            ? 0.035
            : 0
          : 0;
      return { repo, score: base + topicBoost + qualityBoost + selfHostedBoost, matched };
    })
    .sort((a, b) => b.score - a.score);

  let results: SearchResult[] = ranked.slice(0, 24).map((r) => ({
    repo: r.repo,
    score: Number(r.score.toFixed(5)),
    reason: null,
    matched: r.matched,
    warning: warningFor(r.repo),
  }));

  if (llmAvailable()) {
    const reranked = await rerankSearch(
      trimmed,
      results.map((r) => ({
        id: r.repo.id,
        fullName: r.repo.fullName,
        description: r.repo.description,
        topics: r.repo.topics,
        stars: r.repo.stars,
        pushedAt: r.repo.pushedAt,
        license: r.repo.license,
      })),
    );
    if (reranked) {
      const byId = new Map(results.map((r) => [r.repo.id, r]));
      const ordered: SearchResult[] = [];
      for (const item of reranked) {
        const found = byId.get(item.id);
        if (found) {
          ordered.push({ ...found, reason: item.reason });
          byId.delete(item.id);
        }
      }
      for (const extra of byId.values()) {
        if (ordered.length >= (options.limit ?? 10)) break;
        ordered.push(extra);
      }
      results = ordered;
    }
  }

  const limit = Math.min(Math.max(options.limit ?? 10, 1), 20);
  const final = results.slice(0, limit);

  if (final.length && trimmed.length >= 2) {
    try {
      logSearch(trimmed, JSON.stringify(options));
    } catch {
      // analytics must never break search
    }
  }

  const mode = vec.length && lexical.length ? "hybrid" : vec.length ? "semantic" : "lexical";
  return {
    query: trimmed,
    results: final,
    tookMs: Date.now() - started,
    mode,
    note:
      mode === "lexical"
        ? "Ranked by keyword match and signal strength."
        : mode === "semantic"
          ? "Ranked by meaning, then signal strength."
          : "Hybrid: keyword + meaning, then signal strength.",
  };
}

export { formatCompact };
