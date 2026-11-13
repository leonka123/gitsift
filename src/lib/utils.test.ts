import { describe, expect, it } from "vitest";
import { formatCompact, isoWeek, plural, repoHref, truncate, weekStart } from "./utils";

describe("formatCompact", () => {
  it("formats stars the way a dashboard wants", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
    expect(formatCompact(1200)).toBe("1.2k");
    expect(formatCompact(12000)).toBe("12k");
    expect(formatCompact(1_500_000)).toBe("1.5m");
  });
});

describe("dates", () => {
  it("computes ISO weeks", () => {
    expect(isoWeek(new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
    expect(isoWeek(new Date("2026-11-12T12:00:00Z"))).toBe("2026-W46");
  });

  it("finds the Monday of the week", () => {
    expect(weekStart(new Date("2026-11-12T12:00:00Z"))).toBe("2026-11-09");
    expect(weekStart(new Date("2026-11-09T12:00:00Z"))).toBe("2026-11-09");
  });
});

describe("helpers", () => {
  it("builds safe repo hrefs", () => {
    expect(repoHref("openclaw/openclaw")).toBe("/repo/openclaw/openclaw");
    expect(repoHref("a b/c d")).toBe("/repo/a%20b/c%20d");
  });

  it("truncates without cutting the ellipsis", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a long sentence here", 8)).toBe("a long…");
  });

  it("pluralises", () => {
    expect(plural(1, "repo", "repos")).toBe("repo");
    expect(plural(2, "repo", "repos")).toBe("repos");
  });
});
