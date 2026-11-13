/**
 * Daily ingestion: discover → enrich → snapshot → score → summarize → embed → digest.
 *
 * Without GITHUB_TOKEN this stays within the unauthenticated search limit by
 * pacing requests. With a token it is much faster and can backfill history.
 *
 * Usage:
 *   npm run ingest
 *   npm run ingest -- --max-queries=4
 */
import { runIngest } from "../src/lib/ingest";

const maxQueriesArg = process.argv.find((arg) => arg.startsWith("--max-queries="));
const maxQueries = maxQueriesArg ? Number(maxQueriesArg.split("=")[1]) : undefined;

const result = await runIngest({ maxQueries });
console.log(JSON.stringify(result, null, 2));
