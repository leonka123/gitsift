import type { Repo } from "../types";

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const SPAM_NAME =
  /^(awesome|awesome-|free-|best-|top-|cheat|interview|100-days|roadmap|build-your-own|system-design|coding-interview|project-based|curriculum|handbook|free-programming|books|notebook|notebooks|examples|sample|demo|tutorial|learning|course)/i;
const SPAM_DESC =
  /(udemy|course|coupon|airdrop|giveaway|telegram channel|interview questions|leetcode solutions|assignment help|promo code|curated list|collective list|study plan|learn to code|cheat ?sheet)/i;
const SPAM_README = /(join (our|my) telegram|buy (the|this) course|dm me for|airdrop)/i;
const LEARNING_DESC =
  /(curated list|collection of (free|awesome|resources)|roadmap|interview|study plan|curriculum|tutorials for|books about|programming books|notebooks?|colab|learning path|from scratch)/i;

export type QualityInput = {
  name: string;
  description: string | null;
  license: string | null;
  topics: string[];
  stars: number;
  forks: number;
  createdAt: string;
  pushedAt: string | null;
  archived: boolean;
  isFork: boolean;
  ownerType: string | null;
  readme: string | null;
};

export type QualityAssessment = {
  quality: number;
  botScore: number;
  flags: string[];
};

export function daysSince(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return 3650;
  return Math.max(0, (now - new Date(iso).getTime()) / 86_400_000);
}

export function assessQuality(input: QualityInput, now = Date.now()): QualityAssessment {
  let score = 0.12;
  const flags: string[] = [];

  if (input.license) score += 0.18;
  else flags.push("no-license");

  const descLen = input.description?.trim().length ?? 0;
  if (descLen >= 20) score += 0.07;
  if (descLen >= 60) score += 0.05;
  if (descLen === 0) {
    score -= 0.18;
    flags.push("no-description");
  }

  if (input.topics.length >= 2) score += 0.07;
  if (input.topics.length >= 4) score += 0.04;

  score += Math.min(0.14, (Math.log10(input.stars + 1) / 5) * 0.14);
  score += Math.min(0.08, (Math.log10(input.forks + 1) / 3.2) * 0.08);

  const pushAge = daysSince(input.pushedAt, now);
  if (pushAge <= 14) score += 0.14;
  else if (pushAge <= 60) score += 0.09;
  else if (pushAge <= 180) score += 0.04;
  else flags.push("stale");

  const age = daysSince(input.createdAt, now);
  if (age >= 30) score += 0.05;

  const readmeLen = input.readme?.trim().length ?? 0;
  if (readmeLen >= 600) score += 0.1;
  else if (readmeLen >= 200) score += 0.05;

  if (input.ownerType === "Organization") score += 0.04;

  if (SPAM_NAME.test(input.name)) {
    score -= 0.28;
    flags.push("list-repo");
  }
  if (input.description && SPAM_DESC.test(input.description)) {
    score -= 0.35;
    flags.push("spam-description");
  } else if (input.description && LEARNING_DESC.test(input.description)) {
    score -= 0.22;
    flags.push("learning-resource");
  }
  if (input.readme && SPAM_README.test(input.readme)) {
    score -= 0.2;
    flags.push("spam-readme");
  }
  if (input.archived) {
    score -= 0.5;
    flags.push("archived");
  }
  if (input.isFork) {
    score -= 0.4;
    flags.push("fork");
  }

  // Stars arriving faster than the project can possibly be used is a smell.
  const starsPerDay = input.stars / Math.max(age, 1);
  let botScore = 0;
  if (starsPerDay > 800) botScore += 0.55;
  else if (starsPerDay > 300) botScore += 0.35;
  if (input.stars > 1000 && input.forks < 5 && pushAge > 30) botScore += 0.2;
  if (age < 3 && input.stars > 1500) botScore += 0.25;

  if (botScore > 0.3) flags.push("star-anomaly");

  return {
    quality: Number(clamp(score).toFixed(3)),
    botScore: Number(clamp(botScore).toFixed(3)),
    flags,
  };
}

export function computeRates(stars: number, createdAt: string, now = Date.now()) {
  const ageDays = Math.max(daysSince(createdAt, now), 1);
  return {
    ageDays,
    starsPerDay: Number((stars / ageDays).toFixed(3)),
  };
}

/** Raw, unnormalised heat. Kept pure so it can be unit-tested. */
export function rawHeat(repo: Pick<
  Repo,
  "stars" | "forks" | "createdAt" | "pushedAt" | "quality" | "botScore"
>, now = Date.now()): number {
  const ageDays = Math.max(daysSince(repo.createdAt, now), 1);
  const starsPerDay = repo.stars / ageDays;
  const pushAge = daysSince(repo.pushedAt, now);

  const momentum = clamp(Math.log1p(starsPerDay * 7) / Math.log1p(7 * 900));
  const scale = clamp(Math.log10(repo.stars + 1) / 5.5);
  const freshness = clamp(1 - ageDays / 1100);
  const activity = clamp(1 - pushAge / 120);
  const quality = clamp(repo.quality);
  const trust = clamp(1 - repo.botScore);

  const raw =
    0.5 * momentum +
    0.16 * scale +
    0.14 * freshness +
    0.1 * activity +
    0.24 * quality;

  return raw * (0.55 + 0.45 * trust);
}

/**
 * Convert raw heat into a 0–100 percentile so the UI can show a signal
 * strength that is stable and comparable across a growing dataset.
 */
export function heatPercentiles(items: { id: number; raw: number }[]): Map<number, number> {
  const sorted = [...items].sort((a, b) => a.raw - b.raw);
  const out = new Map<number, number>();
  const n = sorted.length;
  if (n === 0) return out;
  if (n === 1) {
    out.set(sorted[0].id, 100);
    return out;
  }
  sorted.forEach((item, index) => {
    out.set(item.id, Number(((index / (n - 1)) * 100).toFixed(1)));
  });
  return out;
}

export function signalBucket(heat: number): 1 | 2 | 3 | 4 | 5 {
  if (heat >= 90) return 5;
  if (heat >= 75) return 4;
  if (heat >= 55) return 3;
  if (heat >= 35) return 2;
  return 1;
}

export function signalWord(heat: number): string {
  return ["quiet", "warming", "rising", "strong", "peak"][signalBucket(heat) - 1];
}

export function qualityFactors(repo: Repo): { label: string; ok: boolean }[] {
  return [
    { label: "Open license", ok: Boolean(repo.license) },
    { label: "Documented", ok: (repo.readme?.length ?? 0) >= 400 || (repo.summary?.length ?? 0) >= 120 },
    { label: "Active in 30 days", ok: daysSince(repo.pushedAt) <= 30 },
    { label: "Clear description", ok: (repo.description?.length ?? 0) >= 40 },
    { label: "Topic signals", ok: repo.topics.length >= 2 },
    { label: "Trusted owner", ok: repo.ownerType === "Organization" || repo.stars > 500 },
  ];
}
