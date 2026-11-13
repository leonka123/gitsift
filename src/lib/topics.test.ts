import { describe, expect, it } from "vitest";
import {
  canonicalTopic,
  parseQuery,
  prettyTopic,
  tokenize,
  topicAliases,
  topicBlurb,
} from "./topics";

describe("tokenize", () => {
  it("drops stopwords and keeps technical tokens", () => {
    const tokens = tokenize("I need an AI agent for coding");
    expect(tokens).toContain("ai");
    expect(tokens).toContain("agent");
    expect(tokens).toContain("coding");
    expect(tokens).not.toContain("need");
  });

  it("keeps c++, c# and dotted names", () => {
    const tokens = tokenize("a c++ library like socket.io for c#");
    expect(tokens).toContain("c++");
    expect(tokens).toContain("c#");
    expect(tokens).toContain("socket.io");
  });
});

describe("parseQuery", () => {
  it("expands Russian concepts into English ones", () => {
    const parsed = parseQuery("инструмент для парсинга сайтов");
    expect(parsed.expanded).toContain("scraping");
    expect(parsed.expanded).toContain("crawler");
  });

  it("detects a language and a license", () => {
    const parsed = parseQuery("Rust CLI for JSON under MIT");
    expect(parsed.language).toBe("Rust");
    expect(parsed.wantsLicense).toBe("MIT");
  });

  it("normalises Apache-2 spellings", () => {
    expect(parseQuery("a database with apache 2").wantsLicense).toBe("Apache-2.0");
  });

  it("detects self-hosted intent", () => {
    expect(parseQuery("self hosted analytics").selfHosted).toBe(true);
    expect(parseQuery("локальный сервер для заметок").selfHosted).toBe(true);
    expect(parseQuery("vector database").selfHosted).toBe(false);
  });
});

describe("topics", () => {
  it("presents acronyms properly", () => {
    expect(prettyTopic("ai-agents")).toBe("AI Agents");
    expect(prettyTopic("mcp")).toBe("MCP");
    expect(prettyTopic("developer-tools")).toBe("Developer Tools");
  });

  it("merges aliases into a canonical topic", () => {
    expect(canonicalTopic("agent")).toBe("ai-agents");
    expect(canonicalTopic("agentic-coding")).toBe("ai-agents");
    expect(canonicalTopic("databases")).toBe("databases");
  });

  it("returns every alias for a canonical topic", () => {
    const aliases = topicAliases("ai-agents");
    expect(aliases).toContain("ai-agents");
    expect(aliases).toContain("agent");
    expect(aliases).toContain("agentic");
  });

  it("always has a blurb", () => {
    expect(topicBlurb("ai-agents").length).toBeGreaterThan(10);
    expect(topicBlurb("some-unknown-topic").length).toBeGreaterThan(10);
  });
});
