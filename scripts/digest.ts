import { buildAndSaveDigest } from "../src/lib/pipeline";

const week = process.argv[2];
const digestId = await buildAndSaveDigest(week);
console.log(`Built digest #${digestId}.`);
