import { fillSummaries } from "../src/lib/pipeline";

const limit = Number(process.argv[2] ?? 100);
const count = await fillSummaries(limit);
console.log(`Summarized ${count} repositories.`);
