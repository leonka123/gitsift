const HASH_DIMS = 384;
const HASH_MODEL = "hash-384-v1";

export type EmbeddingConfig = {
  provider: "hash" | "openai";
  model: string;
  dims: number | null;
};

export function embeddingConfig(): EmbeddingConfig {
  const provider = (process.env.EMBEDDINGS_PROVIDER ?? "hash").toLowerCase();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (provider === "openai" && key) {
    return {
      provider: "openai",
      model: process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
      dims: null,
    };
  }
  return { provider: "hash", model: HASH_MODEL, dims: HASH_DIMS };
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalize(vector: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
  }
  return vector;
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}+#]+/gu) ?? []).filter((w) => w.length > 1);
}

function addToken(vector: Float32Array, token: string, weight: number): void {
  const h = fnv1a(token);
  const idx = h % vector.length;
  const sign = fnv1a(token + "#s") & 1 ? 1 : -1;
  vector[idx] += sign * weight;
}

/**
 * Deterministic lexical hashing: words + bigrams + character trigrams.
 * It is not a neural embedding, but it gives a useful semantic-ish signal with
 * zero dependencies, zero cost and zero network. Swapping to OpenAI embeddings
 * is a single env var.
 */
export function hashEmbed(text: string, dims = HASH_DIMS): Float32Array {
  const vector = new Float32Array(dims);
  const tokens = words(text);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    addToken(vector, token, 1);
    if (i + 1 < tokens.length) addToken(vector, `${token}_${tokens[i + 1]}`, 0.55);
    if (token.length >= 5) {
      const padded = `#${token}#`;
      for (let j = 0; j + 3 <= padded.length; j++) {
        addToken(vector, padded.slice(j, j + 3), 0.22);
      }
    }
  }
  return normalize(vector);
}

export function embeddingFromBuffer(buffer: Buffer): Float32Array {
  const copy = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Float32Array(copy);
}

export function embeddingToBuffer(vector: Float32Array): Buffer {
  return Buffer.from(new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength));
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

function repoText(input: {
  fullName: string;
  description: string | null;
  topics: string[];
  summary: string | null;
  readme: string | null;
}): string {
  return [
    input.fullName.replace("/", " "),
    input.fullName.replace("/", " "),
    input.description ?? "",
    input.description ?? "",
    input.topics.join(" "),
    input.topics.join(" "),
    input.summary ?? "",
    (input.readme ?? "").slice(0, 1600),
  ].join(" ");
}

async function openAiEmbed(texts: string[], config: EmbeddingConfig): Promise<Float32Array[]> {
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: config.model, input: texts }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => normalize(Float32Array.from(d.embedding)));
}

export async function embedBatch(texts: string[]): Promise<{ vectors: Float32Array[]; model: string }> {
  const config = embeddingConfig();
  if (config.provider === "openai") {
    const vectors: Float32Array[] = [];
    for (let i = 0; i < texts.length; i += 64) {
      vectors.push(...(await openAiEmbed(texts.slice(i, i + 64), config)));
    }
    return { vectors, model: config.model };
  }
  return { vectors: texts.map((t) => hashEmbed(t, config.dims ?? HASH_DIMS)), model: config.model };
}

export async function embedText(text: string): Promise<{ vector: Float32Array; model: string }> {
  const { vectors, model } = await embedBatch([text]);
  return { vector: vectors[0], model };
}

export function repoEmbeddingText(repo: {
  fullName: string;
  description: string | null;
  topics: string[];
  summary: string | null;
  readme: string | null;
}): string {
  return repoText(repo);
}

export async function embedRepo(repo: {
  fullName: string;
  description: string | null;
  topics: string[];
  summary: string | null;
  readme: string | null;
}): Promise<{ vector: Float32Array; model: string }> {
  return embedText(repoText(repo));
}
