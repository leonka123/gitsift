/**
 * Loads the bundled seed slice into SQLite, then runs scoring, summaries,
 * embeddings and builds the current weekly digest.
 *
 * Usage:
 *   npm run db:seed             # fast, heuristic copy
 *   npm run db:seed -- --llm    # use the configured LLM for summaries too
 *   npm run db:seed -- --reset  # wipe repos/digests first
 */
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db/client";
import { getCounts, insertSnapshot, setMeta, upsertRepo } from "../src/db/queries";
import {
  buildAndSaveDigest,
  fillEmbeddings,
  fillSummaries,
  scoreAllRepos,
} from "../src/lib/pipeline";
import type { SeedRepo } from "../src/types";

export async function runSeed({
  reset = false,
  llm = false,
}: { reset?: boolean; llm?: boolean } = {}): Promise<void> {
  if (!llm) process.env.LLM_ENABLED = "false";

  const file = path.join(process.cwd(), "data", "seed", "repos.json");
  if (!fs.existsSync(file)) {
    throw new Error(`Seed file not found: ${file}. Run "npm run fetch:seed" first.`);
  }

  const payload = JSON.parse(fs.readFileSync(file, "utf8")) as {
    generated_at: string;
    count: number;
    repos: SeedRepo[];
  };

  const db = getDb();
  if (reset) {
    console.log("Resetting repositories, snapshots and digests…");
    db.exec(`
      delete from digest_items;
      delete from digests;
      delete from star_snapshots;
      delete from repos;
    `);
  }

  console.log(`Seeding ${payload.repos.length} repositories…`);
  const today = new Date().toISOString().slice(0, 10);

  const tx = db.transaction((repos: SeedRepo[]) => {
    for (const repo of repos) {
      upsertRepo({
        id: repo.id,
        fullName: repo.full_name,
        owner: repo.owner,
        name: repo.name,
        description: repo.description,
        homepage: repo.homepage,
        language: repo.language,
        topics: repo.topics ?? [],
        license: repo.license,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.open_issues,
        createdAt: repo.created_at,
        pushedAt: repo.pushed_at,
        archived: false,
        isFork: false,
        ownerType: repo.owner_type,
        ownerAvatar: repo.owner_avatar,
        readme: repo.readme,
      });
      insertSnapshot(repo.id, today, repo.stars);
    }
  });
  tx(payload.repos);

  console.log("Scoring…");
  const scored = scoreAllRepos();

  console.log("Writing summaries…");
  const summarized = await fillSummaries(400);

  console.log("Embedding…");
  const embedded = await fillEmbeddings(2000);

  console.log("Building the weekly digest…");
  const digestId = await buildAndSaveDigest();

  setMeta("seeded_at", new Date().toISOString());
  setMeta("seed_source", payload.generated_at);

  const counts = getCounts();
  console.log("");
  console.log(`Scored:   ${scored}`);
  console.log(`Summaries:${summarized}`);
  console.log(`Embedded: ${embedded}`);
  console.log(`Digest:   #${digestId}`);
  console.log(`Database: ${counts.repos} repos, ${counts.snapshots} snapshots, ${counts.digests} digests`);
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed.ts");

if (invokedDirectly) {
  runSeed({
    reset: process.argv.includes("--reset") || process.env.SEED_RESET === "1",
    llm: process.argv.includes("--llm"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
