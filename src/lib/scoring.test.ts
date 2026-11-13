import { describe, expect, it } from "vitest";
import { assessQuality, computeRates, heatPercentiles, rawHeat, signalBucket, signalWord } from "./scoring";

const goodProject = {
  name: "fast-agent",
  description: "A small, focused framework for building tool-using AI agents in TypeScript.",
  license: "MIT",
  topics: ["ai-agents", "typescript", "tools"],
  stars: 1200,
  forks: 90,
  createdAt: new Date(Date.now() - 120 * 86_400_000).toISOString(),
  pushedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  archived: false,
  isFork: false,
  ownerType: "Organization",
  readme: "x".repeat(1200),
};

describe("assessQuality", () => {
  it("rewards a documented, licensed, active project", () => {
    const result = assessQuality(goodProject);
    expect(result.quality).toBeGreaterThan(0.7);
    expect(result.botScore).toBe(0);
  });

  it("punishes a missing license and description", () => {
    const result = assessQuality({
      ...goodProject,
      license: null,
      description: null,
      readme: null,
      topics: [],
    });
    expect(result.quality).toBeLessThan(0.55);
    expect(result.flags).toContain("no-license");
    expect(result.flags).toContain("no-description");
  });

  it("penalises curated list repositories", () => {
    const list = assessQuality({ ...goodProject, name: "awesome-agents", description: "A curated list of agents" });
    expect(list.quality).toBeLessThan(assessQuality(goodProject).quality);
    expect(list.flags).toContain("list-repo");
  });

  it("flags an impossible star spike", () => {
    const result = assessQuality({
      ...goodProject,
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      pushedAt: new Date().toISOString(),
      stars: 9000,
      forks: 0,
    });
    expect(result.botScore).toBeGreaterThan(0.45);
    expect(result.flags).toContain("star-anomaly");
  });

  it("heavily penalises archived repos and forks", () => {
    expect(assessQuality({ ...goodProject, archived: true }).quality).toBeLessThan(0.55);
    expect(assessQuality({ ...goodProject, isFork: true }).quality).toBeLessThan(0.6);
  });
});

describe("computeRates", () => {
  it("computes stars per day with a one-day floor", () => {
    const createdAt = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const { starsPerDay } = computeRates(100, createdAt);
    expect(starsPerDay).toBeGreaterThan(9.9);
    expect(starsPerDay).toBeLessThan(10.1);
  });
});

describe("rawHeat and percentiles", () => {
  const base = {
    forks: 100,
    createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
    pushedAt: new Date().toISOString(),
    quality: 0.8,
    botScore: 0,
  };

  it("ranks a faster-growing project above a slower one", () => {
    const fast = rawHeat({ ...base, stars: 9000 });
    const slow = rawHeat({ ...base, stars: 900 });
    expect(fast).toBeGreaterThan(slow);
  });

  it("damps a project with a bad trust score", () => {
    const trusted = rawHeat({ ...base, stars: 2000, botScore: 0 });
    const suspicious = rawHeat({ ...base, stars: 2000, botScore: 0.8 });
    expect(suspicious).toBeLessThan(trusted);
  });

  it("maps raw values to stable percentiles", () => {
    const map = heatPercentiles([
      { id: 1, raw: 10 },
      { id: 2, raw: 20 },
      { id: 3, raw: 30 },
    ]);
    expect(map.get(1)).toBe(0);
    expect(map.get(2)).toBe(50);
    expect(map.get(3)).toBe(100);
    expect(heatPercentiles([{ id: 1, raw: 5 }]).get(1)).toBe(100);
    expect(heatPercentiles([]).size).toBe(0);
  });
});

describe("signal buckets", () => {
  it("uses readable bands", () => {
    expect(signalBucket(0)).toBe(1);
    expect(signalBucket(34)).toBe(1);
    expect(signalBucket(35)).toBe(2);
    expect(signalBucket(55)).toBe(3);
    expect(signalBucket(75)).toBe(4);
    expect(signalBucket(90)).toBe(5);
    expect(signalWord(95)).toBe("peak");
  });
});
