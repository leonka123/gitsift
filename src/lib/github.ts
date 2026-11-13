import type { RepoUpsert } from "../db/queries";

const API = "https://api.github.com";
const UA = "GitSift/0.1 (+https://gitsift.dev)";

export type GitHubSearchItem = {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; type: string; avatar_url: string } | null;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  license: { spdx_id: string | null } | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  pushed_at: string | null;
  archived: boolean;
  fork: boolean;
};

export type SearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchItem[];
};

function headers(accept = "application/vnd.github+json"): Record<string, string> {
  const h: Record<string, string> = {
    Accept: accept,
    "User-Agent": UA,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN?.trim()) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
  }
  return h;
}

export class GitHubError extends Error {
  status: number;
  resetAt: number | null;
  constructor(message: string, status: number, resetAt: number | null) {
    super(message);
    this.status = status;
    this.resetAt = resetAt;
  }
}

export async function githubFetch<T>(
  url: string,
  options: { accept?: string; retries?: number } = {},
): Promise<T> {
  const retries = options.retries ?? 1;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
      headers: headers(options.accept),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) return (await res.json()) as T;

    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    const resetAt = reset ? Number(reset) * 1000 : null;

    if ((res.status === 403 || res.status === 429) && attempt < retries) {
      const wait = resetAt ? Math.max(1000, Math.min(resetAt - Date.now() + 1200, 65_000)) : 5000;
      console.warn(`GitHub rate limit hit (${remaining ?? "?"} left), waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    throw new GitHubError(
      `GitHub request failed: ${res.status} ${res.statusText} — ${url}`,
      res.status,
      resetAt,
    );
  }
  throw new Error("unreachable");
}

export async function searchRepositories(
  query: string,
  options: { sort?: "stars" | "updated"; order?: "desc" | "asc"; perPage?: number; page?: number } = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    sort: options.sort ?? "stars",
    order: options.order ?? "desc",
    per_page: String(options.perPage ?? 100),
    page: String(options.page ?? 1),
  });
  return githubFetch<SearchResponse>(`/search/repositories?${params.toString()}`);
}

export function normalizeLicense(item: GitHubSearchItem): string | null {
  const id = item.license?.spdx_id;
  if (!id || id === "NOASSERTION") return null;
  return id;
}

export function toRepoUpsert(item: GitHubSearchItem, readme: string | null = null): RepoUpsert {
  return {
    id: item.id,
    fullName: item.full_name,
    owner: item.owner?.login ?? item.full_name.split("/")[0],
    name: item.name,
    description: item.description,
    homepage: item.homepage || null,
    language: item.language,
    topics: item.topics ?? [],
    license: normalizeLicense(item),
    stars: item.stargazers_count,
    forks: item.forks_count,
    openIssues: item.open_issues_count,
    createdAt: item.created_at,
    pushedAt: item.pushed_at,
    archived: item.archived,
    isFork: item.fork,
    ownerType: item.owner?.type ?? null,
    ownerAvatar: item.owner?.avatar_url ?? null,
    readme,
  };
}

/** README via raw.githubusercontent.com — does not consume the API quota. */
export async function fetchReadme(fullName: string): Promise<string | null> {
  for (const file of ["README.md", "readme.md"]) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/${file}`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const text = await res.text();
        return cleanReadme(text);
      }
    } catch {
      // try the next filename
    }
  }
  return null;
}

export function cleanReadme(md: string): string {
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

/**
 * Stars at a given date, using the stargazers API with star timestamps.
 * Paginates with per_page=100 and binary-searches the page that crosses the
 * date, so cost is O(log n) requests rather than O(n).
 */
export async function starsAtDate(fullName: string, date: string): Promise<number | null> {
  const target = new Date(date).getTime();

  // First request with per_page=1 gives the total count in the Link header.
  const first = await fetch(`${API}/repos/${fullName}/stargazers?per_page=1`, {
    headers: headers("application/vnd.github.star+json"),
    signal: AbortSignal.timeout(20_000),
  });
  if (!first.ok) return null;
  const link = first.headers.get("link");
  const lastMatch = link?.match(/[?&]page=(\d+)>; rel="last"/);
  const total = lastMatch ? Number(lastMatch[1]) : 1;

  let low = 1;
  let high = Math.ceil(total / 100);
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const res = await fetch(`${API}/repos/${fullName}/stargazers?per_page=100&page=${mid}`, {
      headers: headers("application/vnd.github.star+json"),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const page = (await res.json()) as { starred_at: string }[];
    if (!page.length) {
      high = mid - 1;
      continue;
    }
    const firstDate = new Date(page[0].starred_at).getTime();
    if (firstDate <= target) low = mid + 1;
    else high = mid;
  }

  // `low` is the first page whose first star is after the target.
  const before = (low - 1) * 100;
  return Math.max(0, Math.min(total, before));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}
