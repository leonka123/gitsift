/**
 * First-run guard for `npm run dev`.
 *
 * The app is useless with an empty database, and "clone → install → dev" is the
 * path most people take. If the database has no repositories yet, load the
 * bundled seed slice once; otherwise do nothing and stay out of the way.
 */
import { getDb } from "../src/db/client";
import { getCounts } from "../src/db/queries";
import { runSeed } from "./seed";

function repoCount(): number {
  try {
    const db = getDb();
    const row = db.prepare("select count(*) as n from repos").get() as { n: number } | undefined;
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

if (repoCount() === 0) {
  console.log("No database yet — loading the bundled seed slice (about a minute, once).");
  await runSeed({ reset: true });
  console.log(`Ready. ${getCounts().repos} repositories seeded.`);
} else {
  console.log(`Database ready: ${repoCount()} repositories.`);
}
