import { fillEmbeddings } from "../src/lib/pipeline";

const limit = Number(process.argv[2] ?? 1000);
const count = await fillEmbeddings(limit);
console.log(`Embedded ${count} repositories.`);
