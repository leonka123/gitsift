import { describe, expect, it } from "vitest";
import { cosine, embeddingFromBuffer, embeddingToBuffer, hashEmbed } from "./embeddings";

describe("hashEmbed", () => {
  it("produces a normalised 384-dimensional vector", () => {
    const vector = hashEmbed("self-hosted analytics for postgres");
    expect(vector.length).toBe(384);
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("is deterministic", () => {
    const a = hashEmbed("rust cli with good errors");
    const b = hashEmbed("rust cli with good errors");
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("scores related text higher than unrelated text", () => {
    const query = hashEmbed("self-hosted analytics dashboard for postgres");
    const related = hashEmbed("open-source analytics platform with postgres and self-hosted dashboards");
    const unrelated = hashEmbed("a game engine for the nintendo switch written in rust");
    expect(cosine(query, related)).toBeGreaterThan(cosine(query, unrelated));
  });

  it("round-trips through SQLite-friendly buffers", () => {
    const vector = hashEmbed("mcp server for postgres");
    const restored = embeddingFromBuffer(embeddingToBuffer(vector));
    expect(Array.from(restored)).toEqual(Array.from(vector));
    expect(cosine(vector, restored)).toBeCloseTo(1, 6);
  });

  it("returns zero similarity for mismatched dimensions", () => {
    expect(cosine(hashEmbed("a"), hashEmbed("b", 128))).toBe(0);
  });
});
