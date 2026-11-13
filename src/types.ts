export type FeedMode = "rising" | "new" | "gems" | "top";

export type Repo = {
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
  summary: string | null;
  whyNow: string | null;
  buildIdea: string | null;
  quality: number;
  botScore: number;
  starsPerDay: number;
  heat: number;
  velocity7d: number | null;
  velocitySource: "snapshot" | "modeled";
  firstSeenAt: string;
  lastSyncedAt: string;
};

export type RepoRow = {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string;
  topics_text: string;
  license: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  created_at: string;
  pushed_at: string | null;
  archived: number;
  is_fork: number;
  owner_type: string | null;
  owner_avatar: string | null;
  readme: string | null;
  summary: string | null;
  why_now: string | null;
  build_idea: string | null;
  quality: number;
  bot_score: number;
  stars_per_day: number;
  heat: number;
  velocity_7d: number | null;
  velocity_source: string;
  first_seen_at: string;
  last_synced_at: string;
};

export type SeedRepo = {
  id: number;
  full_name: string;
  owner: string;
  owner_type: string | null;
  owner_avatar: string | null;
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  license: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  created_at: string;
  pushed_at: string | null;
  readme: string | null;
};

export type Digest = {
  id: number;
  week: string;
  title: string;
  intro: string | null;
  published: boolean;
  createdAt: string;
  itemCount?: number;
};

export type DigestItem = {
  position: number;
  blurb: string | null;
  repo: Repo;
};

export type DigestWithItems = Digest & { items: DigestItem[] };

export type FeedResult = {
  repos: Repo[];
  hasMore: boolean;
};

export type SearchResult = {
  repo: Repo;
  score: number;
  reason: string | null;
  matched: string[];
  warning?: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  tookMs: number;
  mode: "hybrid" | "lexical" | "semantic";
  note?: string;
};

export type ShelfStats = {
  repos: number;
  new7d: number;
  totalStars: number;
  languages: number;
  peak: number;
  updatedAt: string | null;
};
