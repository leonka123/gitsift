const ACRONYMS: Record<string, string> = {
  ai: "AI",
  api: "API",
  cli: "CLI",
  css: "CSS",
  gpu: "GPU",
  html: "HTML",
  http: "HTTP",
  ios: "iOS",
  js: "JS",
  json: "JSON",
  jwt: "JWT",
  k8s: "K8s",
  llm: "LLM",
  mcp: "MCP",
  ml: "ML",
  orm: "ORM",
  rag: "RAG",
  sdk: "SDK",
  sql: "SQL",
  sso: "SSO",
  ts: "TS",
  ui: "UI",
  web3: "Web3",
};

export function prettyTopic(topic: string): string {
  return topic
    .split("-")
    .map((part) => ACRONYMS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type FeaturedTopic = { slug: string; title: string; blurb: string };

const TOPIC_ALIASES: Record<string, string> = {
  agent: "ai-agents",
  agents: "ai-agents",
  "ai-agent": "ai-agents",
  "ai-agents": "ai-agents",
  agentic: "ai-agents",
  "agentic-ai": "ai-agents",
  "agentic-coding": "ai-agents",
  "large-language-model": "llm",
  "large-language-models": "llm",
  "retrieval-augmented-generation": "rag",
  "model-context-protocol": "mcp",
  devtools: "developer-tools",
  selfhosted: "self-hosted",
  "computer-vision": "computer-vision",
  ml: "machine-learning",
};

export function canonicalTopic(topic: string): string {
  return TOPIC_ALIASES[topic] ?? topic;
}

export function topicAliases(canonical: string): string[] {
  const aliases = [canonical];
  for (const [alias, target] of Object.entries(TOPIC_ALIASES)) {
    if (target === canonical && alias !== canonical) aliases.push(alias);
  }
  return aliases;
}

export function topicLabel(topic: string): string {
  return prettyTopic(canonicalTopic(topic));
}

export const FEATURED_TOPICS: FeaturedTopic[] = [
  { slug: "ai-agents", title: "AI agents", blurb: "Autonomous loops, tool use, orchestration." },
  { slug: "mcp", title: "MCP", blurb: "The protocol wiring models to tools and data." },
  { slug: "llm", title: "LLMs", blurb: "Inference, fine-tuning, local models." },
  { slug: "rag", title: "RAG", blurb: "Retrieval, embeddings, knowledge bases." },
  { slug: "developer-tools", title: "Developer tools", blurb: "Editors, terminals, review, observability." },
  { slug: "self-hosted", title: "Self-hosted", blurb: "Own your stack, end to end." },
  { slug: "cli", title: "CLI", blurb: "Terminal-first everything." },
  { slug: "rust", title: "Rust", blurb: "Fast, safe systems code." },
  { slug: "database", title: "Databases", blurb: "Storage, query engines, vector search." },
  { slug: "automation", title: "Automation", blurb: "Workflows that run themselves." },
  { slug: "computer-vision", title: "Computer vision", blurb: "Detection, segmentation, video." },
  { slug: "typescript", title: "TypeScript", blurb: "Types all the way down." },
  { slug: "python", title: "Python", blurb: "The default language of AI." },
  { slug: "webdev", title: "Web dev", blurb: "Frameworks, styling, the edge." },
  { slug: "devops", title: "DevOps", blurb: "Deploy, observe, repeat." },
  { slug: "security", title: "Security", blurb: "AppSec, supply chain, secrets." },
];

export function topicBlurb(slug: string): string {
  const found = FEATURED_TOPICS.find((t) => t.slug === slug);
  if (found) return found.blurb;
  return `Repositories tagged ${prettyTopic(slug)} — ranked by momentum, not raw stars.`;
}

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "into",
  "is", "it", "its", "me", "my", "of", "on", "or", "that", "the", "their", "to", "with",
  "want", "need", "looking", "something", "tool", "tools", "project", "projects", "best",
  "good", "cool", "new", "open", "source", "github", "repo", "repos", "repository",
  "и", "в", "во", "на", "с", "со", "для", "по", "из", "к", "ко", "о", "об", "от", "до",
  "что", "как", "это", "мне", "мой", "моя", "мои", "нужен", "нужна", "нужно", "хочу",
  "ищу", "проект", "проекты", "инструмент", "инструменты", "лучший", "лучшие", "новый",
  "новые", "открытый", "исходный", "код", "репозиторий", "репозитории",
]);

export function tokenize(query: string): string[] {
  return (query.toLowerCase().match(/[\p{L}\p{N}+#._-]+/gu) ?? [])
    .map((t) => t.replace(/^[._-]+|[._-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** English + Russian concept expansion. Keeps the search useful without a model. */
const EXPANSIONS: Record<string, string[]> = {
  agent: ["agent", "agents", "autonomous", "orchestration", "assistant", "copilot"],
  agents: ["agent", "agents", "autonomous", "orchestration", "assistant"],
  агент: ["agent", "agents", "autonomous", "assistant"],
  агенты: ["agent", "agents", "autonomous", "assistant"],
  llm: ["llm", "model", "inference", "transformer", "language-model"],
  model: ["model", "llm", "inference", "transformer"],
  нейросеть: ["llm", "model", "neural", "transformer"],
  нейросети: ["llm", "model", "neural", "transformer"],
  ии: ["ai", "llm", "model", "machine-learning"],
  rag: ["rag", "retrieval", "embedding", "vector", "knowledge-base"],
  retrieval: ["retrieval", "rag", "search", "embedding"],
  поиск: ["search", "retrieval", "rag", "index"],
  эмбеддинги: ["embedding", "vector", "rag"],
  vector: ["vector", "embedding", "similarity", "database"],
  database: ["database", "storage", "sql", "query", "vector"],
  база: ["database", "storage", "sql"],
  бд: ["database", "storage", "sql"],
  ui: ["ui", "interface", "components", "frontend", "design"],
  фронтенд: ["frontend", "ui", "react", "css"],
  frontend: ["frontend", "ui", "react", "css", "components"],
  react: ["react", "frontend", "ui", "components"],
  backend: ["backend", "server", "api", "database"],
  бэкенд: ["backend", "server", "api", "database"],
  api: ["api", "server", "http", "rest", "graphql"],
  cli: ["cli", "terminal", "command-line", "shell"],
  терминал: ["cli", "terminal", "shell", "command-line"],
  automation: ["automation", "workflow", "pipeline", "scheduler"],
  автоматизация: ["automation", "workflow", "pipeline", "scheduler"],
  scraping: ["scraping", "crawler", "browser", "parser"],
  парсинг: ["scraping", "parser", "crawler"],
  security: ["security", "auth", "secrets", "scanning"],
  безопасность: ["security", "auth", "secrets", "scanning"],
  auth: ["auth", "authentication", "oauth", "identity"],
  авторизация: ["auth", "authentication", "oauth", "identity"],
  selfhosted: ["self-hosted", "docker", "homelab", "privacy"],
  self: ["self-hosted", "docker", "privacy"],
  hosted: ["self-hosted", "cloud", "docker"],
  локально: ["self-hosted", "local", "offline", "docker"],
  docker: ["docker", "container", "self-hosted", "kubernetes"],
  kubernetes: ["kubernetes", "k8s", "container", "devops"],
  devops: ["devops", "deployment", "infrastructure", "ci", "observability"],
  деплой: ["deploy", "devops", "infrastructure", "ci"],
  monitoring: ["monitoring", "observability", "metrics", "logging"],
  мониторинг: ["monitoring", "observability", "metrics", "logging"],
  video: ["video", "ffmpeg", "streaming", "media"],
  видео: ["video", "ffmpeg", "streaming", "media"],
  audio: ["audio", "speech", "tts", "voice"],
  аудио: ["audio", "speech", "tts", "voice"],
  image: ["image", "vision", "diffusion", "generation"],
  картинки: ["image", "vision", "diffusion", "generation"],
  vision: ["vision", "image", "detection", "segmentation"],
  game: ["game", "engine", "graphics", "gamedev"],
  игра: ["game", "engine", "graphics", "gamedev"],
  mobile: ["mobile", "ios", "android", "react-native"],
  мобилка: ["mobile", "ios", "android", "react-native"],
  data: ["data", "analytics", "pipeline", "etl"],
  данные: ["data", "analytics", "pipeline", "etl"],
  аналитика: ["analytics", "data", "dashboard", "metrics"],
  note: ["notes", "knowledge", "markdown", "editor"],
  заметки: ["notes", "knowledge", "markdown", "editor"],
  docs: ["docs", "documentation", "knowledge", "markdown"],
  документация: ["docs", "documentation", "knowledge", "markdown"],
  // Russian stems (the simple stemmer below strips common endings).
  сайт: ["website", "web", "site", "frontend"],
  скрапинг: ["scraping", "crawler", "browser", "parser"],
  данн: ["data", "analytics", "pipeline"],
  модел: ["model", "llm", "inference"],
  приложени: ["app", "application", "mobile", "web"],
  разработ: ["developer", "development", "sdk"],
  обработк: ["processing", "pipeline", "data"],
  хранилищ: ["storage", "database", "s3"],
  управлени: ["management", "admin", "dashboard"],
  генерац: ["generation", "image", "text"],
  распознаван: ["recognition", "vision", "ocr"],
  обучени: ["training", "learning", "machine-learning"],
  тестирован: ["testing", "test", "qa"],
  развертыван: ["deployment", "devops", "infrastructure"],
  визуализац: ["visualization", "dashboard", "chart"],
  уведомлен: ["notifications", "alerts", "email"],
  почт: ["email", "smtp", "newsletter"],
  файл: ["file", "storage", "upload"],
  изображени: ["image", "vision", "generation"],
  браузер: ["browser", "extension", "scraping"],
  расширени: ["extension", "browser", "plugin"],
  плагин: ["plugin", "extension", "sdk"],
  контейнер: ["docker", "container", "kubernetes"],
  облак: ["cloud", "aws", "serverless"],
  микросервис: ["microservice", "backend", "api"],
  очеред: ["queue", "kafka", "messaging"],
  кэш: ["cache", "redis", "performance"],
  логирован: ["logging", "observability"],
  метрик: ["metrics", "monitoring", "observability"],
  документац: ["docs", "documentation", "markdown"],
  заметк: ["notes", "markdown", "knowledge"],
  таблиц: ["table", "spreadsheet", "grid"],
  график: ["chart", "graph", "visualization"],
  календар: ["calendar", "scheduler"],
  задач: ["tasks", "todo", "project-management"],
  чат: ["chat", "messaging", "realtime"],
  безопасн: ["security", "auth"],
  шифрован: ["encryption", "crypto", "security"],
  парол: ["password", "secrets", "auth"],
  токен: ["token", "auth", "jwt"],
  игр: ["game", "engine", "graphics"],
  мобильн: ["mobile", "ios", "android"],
};

const LANGUAGE_HINTS: Record<string, string> = {  python: "Python",
  питон: "Python",
  пайтон: "Python",
  typescript: "TypeScript",
  тайпскрипт: "TypeScript",
  javascript: "JavaScript",
  джаваскрипт: "JavaScript",
  rust: "Rust",
  раст: "Rust",
  go: "Go",
  голанг: "Go",
  golang: "Go",
  java: "Java",
  джава: "Java",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  csharp: "C#",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  zig: "Zig",
};

const RU_ENDINGS = [
  "иями", "ями", "ами", "ыми", "ими", "ов", "ев", "ий", "ый", "ая", "ое", "ые",
  "ах", "ях", "ам", "ям", "ом", "ем", "ой", "ей", "ую", "юю", "а", "я", "ы",
  "и", "у", "ю", "е", "о", "ь",
];

/** Very small Russian stemmer: strips one common ending, good enough for lookup. */
function stemVariants(token: string): string[] {
  if (!/[а-яё]/i.test(token) || token.length < 4) return [];
  for (const ending of RU_ENDINGS) {
    if (token.endsWith(ending) && token.length - ending.length >= 3) {
      return [token.slice(0, -ending.length)];
    }
  }
  return [];
}

export type ParsedQuery = {
  raw: string;
  tokens: string[];
  expanded: string[];
  language: string | null;
  selfHosted: boolean;
  wantsLicense: string | null;
};

export function parseQuery(raw: string): ParsedQuery {
  const tokens = tokenize(raw);
  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    for (const variant of [token, ...stemVariants(token)]) {
      const extra = EXPANSIONS[variant];
      if (extra) extra.forEach((e) => expanded.add(e));
    }
  }

  let language: string | null = null;
  for (const token of tokens) {
    if (LANGUAGE_HINTS[token]) language = LANGUAGE_HINTS[token];
  }

  const lower = raw.toLowerCase();
  const selfHosted = /self[- ]?host|on[- ]?prem|docker|локальн|сво[йя] сервер/.test(lower);
  const licenseMatch = /\b(mit|apache[- ]?2|gpl[- ]?3|agpl|bsd)\b/i.exec(raw);
  let license: string | null = null;
  if (licenseMatch) {
    const token = licenseMatch[1].toLowerCase().replace(/\s+/g, "-");
    if (token === "mit") license = "MIT";
    else if (token === "apache-2" || token === "apache2") license = "Apache-2.0";
    else if (token === "gpl-3" || token === "gpl3") license = "GPL-3.0";
    else if (token === "agpl") license = "AGPL-3.0";
    else if (token === "bsd") license = "BSD-3-Clause";
    else license = licenseMatch[1];
  }

  return {
    raw,
    tokens,
    expanded: [...expanded],
    language,
    selfHosted,
    wantsLicense: license,
  };
}
