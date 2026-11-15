import type { Repo } from "../types";
import { daysSince } from "./scoring";
import { formatCompact } from "./utils";
import { canonicalTopic, prettyTopic } from "./topics";
import { SITE_URL } from "./site";

export type LlmConfig = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function llmConfig(): LlmConfig {
  const apiKey = process.env.LLM_API_KEY?.trim() ?? "";
  return {
    enabled: process.env.LLM_ENABLED !== "false" && apiKey.length > 0,
    baseUrl: (process.env.LLM_BASE_URL?.trim() || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
    apiKey,
    model: process.env.LLM_MODEL?.trim() || "google/gemini-2.5-flash",
  };
}

export function llmAvailable(): boolean {
  return llmConfig().enabled;
}

type ChatOptions = {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

async function chat(system: string, user: string, options: ChatOptions = {}): Promise<string | null> {
  const config = llmConfig();
  if (!config.enabled) return null;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 700,
  };
  if (options.json !== false) body.response_format = { type: "json_object" };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "HTTP-Referer": SITE_URL,
          "X-Title": "GitSift",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs ?? 25_000),
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return json.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      return null;
    }
  }
  return null;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clipToWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const body = (space > max * 0.55 ? cut.slice(0, space) : cut)
    .trimEnd()
    .replace(/[,;:.\-–—]+$/, "");
  return `${body}…`;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 12) return null;
  return clipToWord(text, max);
}

const EDITOR_SYSTEM =
  "You are the editor of GitSift, a radar for open-source repositories. You write like a senior engineer: concrete, calm, specific. No marketing language, no emoji, no exclamation marks. Never invent features that are not supported by the provided text. If the source is thin, say so plainly.";

export type RepoNotes = {
  summary: string;
  whyNow: string;
  buildIdea: string;
};

function daysAgo(days: number): string {
  if (days <= 0) return "today";
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function heuristicNotes(repo: Repo): RepoNotes {
  const age = Math.round(daysSince(repo.createdAt));
  const pushAge = Math.round(daysSince(repo.pushedAt));
  const primary = repo.topics[0];

  const description = repo.description?.replace(/\s+/g, " ").trim() ?? "";
  const summary =
    description.length >= 20
      ? clipToWord(description, 240)
      : `${primary ? prettyTopic(primary) : "Open-source"} project with ${formatCompact(repo.stars)} stars and ${
          repo.language ?? "a small"
        } codebase.`;

  let whyNow: string;
  if (age <= 21) {
    whyNow = `Appeared ${daysAgo(age)} and already at ${formatCompact(
      repo.stars,
    )} stars — early, but moving.`;
  } else if (pushAge <= 7) {
    whyNow = `Shipped code ${daysAgo(pushAge)}; the project is still actively maintained.`;
  } else if (primary) {
    whyNow = `Sits in the ${prettyTopic(primary)} stack while the ecosystem is still consolidating.`;
  } else {
    whyNow = `A maintained ${repo.language ?? "open-source"} project with ${formatCompact(
      repo.stars,
    )} stars.`;
  }

  return { summary, whyNow, buildIdea: buildIdeaFor(primary, repo.language) };
}

function buildIdeaFor(topic: string | undefined, language: string | null): string {
  const ideas: Record<string, string> = {
    "ai-agents": "Give it one narrow job inside a hackathon agent and wire the whole loop end to end.",
    mcp: "Expose one internal tool through it, then let your agent call that tool.",
    llm: "Prototype a domain assistant on top of it in an afternoon.",
    rag: "Point it at your own docs and ship a private answer engine.",
    "developer-tools": "Automate one annoying step of your local workflow this weekend.",
    cli: "Wrap your team's most repeated command in it and share the binary.",
    database: "Use it as the storage layer for a small product and see where it bends.",
    automation: "Replace one manual routine with a scheduled version of it.",
    "self-hosted": "Self-host it for a side project and write down what broke.",
    "computer-vision": "Run it on your own photo set and build a tiny searchable demo.",
    security: "Point it at a test repo and turn the output into a weekly report.",
    rust: "Wrap it in a small CLI and benchmark it against your current tool.",
    python: "Import it into a notebook and ship the one function you keep rewriting.",
    typescript: "Drop it into a Next.js app and build a focused demo around it.",
    webdev: "Use it as the skeleton for a one-page product and cut everything else.",
    devops: "Add it to a throwaway repo and see what it catches before production.",
    react: "Rebuild one screen of your app with it and compare the bundle size.",
    vue: "Rebuild one screen of your app with it and compare the bundle size.",
    svelte: "Rebuild one screen of your app with it and compare the bundle size.",
  };
  if (topic && ideas[topic]) return ideas[topic];
  if (language === "Rust") return "Wrap it in a small CLI and benchmark it against your current tool.";
  if (language === "Python") return "Import it into a notebook and ship the one function you keep rewriting.";
  return "Clone it, run the demo, and ship one small feature on top this weekend.";
}

export async function generateRepoNotes(repo: Repo): Promise<RepoNotes> {
  const fallback = heuristicNotes(repo);
  if (!llmAvailable()) return fallback;

  const context = [
    `Repository: ${repo.fullName}`,
    `Description: ${repo.description ?? "(none)"}`,
    `Topics: ${repo.topics.join(", ") || "(none)"}`,
    `Language: ${repo.language ?? "(unknown)"}`,
    `Stars: ${repo.stars}. Created ${repo.createdAt.slice(0, 10)}. Last push ${
      repo.pushedAt?.slice(0, 10) ?? "unknown"
    }. License: ${repo.license ?? "none"}.`,
    repo.summary ? `Existing summary: ${repo.summary}` : "",
    `README excerpt:\n"""\n${(repo.readme ?? "").slice(0, 2600)}\n"""`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `${context}

Return JSON with exactly these keys:
- "summary": 1–2 sentences, max 240 characters. What it does and who it is for. Plain language.
- "why_now": max 160 characters. A factual reason this is worth attention now (newness, release, ecosystem shift, maintenance). If there is not enough evidence, say that.
- "build_idea": max 140 characters. One concrete project someone could build with it this weekend.

Do not repeat the repo name. Do not use the words "revolutionary", "seamless", "game-changing", "AI-powered".`;

  const raw = await chat(EDITOR_SYSTEM, prompt, { maxTokens: 500, temperature: 0.2 });
  const parsed = parseJson<{ summary?: unknown; why_now?: unknown; build_idea?: unknown }>(raw);
  if (!parsed) return fallback;

  return {
    summary: cleanText(parsed.summary, 240) ?? fallback.summary,
    whyNow: cleanText(parsed.why_now, 160) ?? fallback.whyNow,
    buildIdea: cleanText(parsed.build_idea, 140) ?? fallback.buildIdea,
  };
}

const DIGEST_THEMES: { label: string; topics: string[] }[] = [
  {
    label: "AI agents",
    topics: [
      "ai-agents",
      "agent",
      "agentic",
      "agent-skills",
      "agent-skill",
      "agent-tools",
      "agent-orchestration",
      "agent-platform",
      "ai-employee",
    ],
  },
  { label: "MCP", topics: ["mcp", "mcp-server", "model-context-protocol"] },
  {
    label: "RAG",
    topics: ["rag", "retrieval-augmented-generation", "embeddings", "vector-database", "chromadb", "qdrant"],
  },
  { label: "LLMs", topics: ["llm", "local-llm", "inference"] },
  { label: "developer tools", topics: ["developer-tools", "code-review", "cli", "devtools"] },
  { label: "self-hosted", topics: ["self-hosted", "local-first"] },
  { label: "media tooling", topics: ["video-editor", "video-editing", "media-library", "ffmpeg"] },
  { label: "Apple ports", topics: ["apple-silicon", "macos", "ios", "ipa"] },
  { label: "security", topics: ["security", "watermark", "provenance", "prompt-injection"] },
  { label: "automation", topics: ["automation", "workflow-automation"] },
  {
    label: "data infrastructure",
    topics: ["database", "knowledge-graph", "search", "neo4j", "opensearch"],
  },
];

function digestThemes(items: { topics: string[] }[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const topics = new Set(item.topics.map(canonicalTopic));
    for (const theme of DIGEST_THEMES) {
      if (!theme.topics.some((topic) => topics.has(canonicalTopic(topic)))) continue;
      counts.set(theme.label, (counts.get(theme.label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return DIGEST_THEMES.findIndex((t) => t.label === a[0]) - DIGEST_THEMES.findIndex((t) => t.label === b[0]);
    })
    .map(([label]) => label);
}

export async function generateDigestIntro(
  week: string,
  items: { name: string; summary: string | null; topics: string[] }[],
  totalTracked: number,
): Promise<{ title: string; intro: string }> {
  const labels = digestThemes(items).slice(0, 3);
  const primary = labels[0] ?? "developer tooling";
  const secondary = labels[1];
  const weekNumber = week.split("-W")[1];
  const fallback = {
    title: secondary
      ? `Week ${weekNumber}: ${primary}, ${secondary}, and the quiet stack`
      : `Week ${weekNumber}: ${primary} and the quiet stack`,
    intro: `We sifted ${formatCompact(totalTracked)} repositories and kept ${items.length}. The signal leaned toward ${
      labels.slice(0, 3).join(", ") || "developer tooling"
    }. The rest is the quiet stack: tooling that keeps shipping while nobody is looking.`,
  };
  if (!llmAvailable()) return fallback;

  const prompt = `Week: ${week}
Tracked repositories: ${totalTracked}
Selected repositories:
${items
  .map((i, idx) => `${idx + 1}. ${i.name} — ${i.summary ?? ""} [${i.topics.slice(0, 3).join(", ")}]`)
  .join("\n")}

Return JSON with exactly two keys:
- "title": max 72 characters, specific to the week, no colon-only wordplay, no hype.
- "intro": 2–3 sentences, max 420 characters. Explain what the week's signal was and why these repos made the cut. Mention a tradeoff or a caveat if relevant.`;

  const raw = await chat(EDITOR_SYSTEM, prompt, { maxTokens: 350, temperature: 0.35 });
  const parsed = parseJson<{ title?: unknown; intro?: unknown }>(raw);
  return {
    title: cleanText(parsed?.title, 72) ?? fallback.title,
    intro: cleanText(parsed?.intro, 420) ?? fallback.intro,
  };
}

export async function rerankSearch(
  query: string,
  candidates: {
    id: number;
    fullName: string;
    description: string | null;
    topics: string[];
    stars: number;
    pushedAt: string | null;
    license: string | null;
  }[],
): Promise<{ id: number; reason: string }[] | null> {
  if (!llmAvailable() || candidates.length === 0) return null;

  const prompt = `User query: "${query}"

Candidates:
${JSON.stringify(
  candidates.map((c) => ({
    id: c.id,
    name: c.fullName,
    description: c.description,
    topics: c.topics.slice(0, 6),
    stars: c.stars,
    last_push: c.pushedAt?.slice(0, 10) ?? null,
    license: c.license,
  })),
)}

Return JSON: {"results":[{"id": <candidate id>, "reason": "<max 18 words>"}]}.
Pick at most 10, best first. Only use the metadata above. If a candidate is a poor fit, leave it out. Reasons must say why it fits this specific query, not what the repo is.`;

  const raw = await chat(EDITOR_SYSTEM, prompt, { maxTokens: 900, temperature: 0.1 });
  const parsed = parseJson<{ results?: { id?: unknown; reason?: unknown }[] }>(raw);
  if (!parsed?.results || !Array.isArray(parsed.results)) return null;

  const valid = new Set(candidates.map((c) => c.id));
  const out: { id: number; reason: string }[] = [];
  for (const item of parsed.results) {
    const id = typeof item.id === "number" ? item.id : Number(item.id);
    if (!valid.has(id)) continue;
    const reason = cleanText(item.reason, 160);
    if (reason) out.push({ id, reason });
  }
  return out.length >= 3 ? out : null;
}
