import { getCandidateReposForSimilarity, getRepoEmbedding, getReposByIds } from "@/db/queries";
import type { Repo } from "@/types";
import { cosine, embeddingFromBuffer } from "./embeddings";

/**
 * Nearest neighbours by the configured embedding. With the default lexical
 * hashing this is cheap and dependency-free; with OpenAI embeddings it becomes
 * genuinely semantic without changing the call site.
 */
export function getSimilarRepos(repo: Repo, limit = 4): Repo[] {
  const source = getRepoEmbedding(repo.id);
  if (!source) return [];
  const vector = embeddingFromBuffer(source.embedding);

  const scored = getCandidateReposForSimilarity()
    .filter((item) => item.id !== repo.id)
    .map((item) => {
      const candidate = embeddingFromBuffer(item.embedding);
      return { id: item.id, score: cosine(vector, candidate) };
    })
    .filter((item) => item.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return getReposByIds(scored.map((item) => item.id));
}
