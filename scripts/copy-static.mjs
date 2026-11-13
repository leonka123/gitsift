/**
 * Next.js `output: "standalone"` does not copy static assets into the standalone
 * folder. This script runs automatically after `next build` so `npm start` can
 * serve the exact artifact that ships in the Docker image.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.warn("No .next/standalone folder — skipping static copy.");
  process.exit(0);
}

const copies = [
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
  [path.join(root, "public"), path.join(standalone, "public")],
];

for (const [from, to] of copies) {
  if (!fs.existsSync(from)) continue;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`Copied ${path.relative(root, from)} → ${path.relative(root, to)}`);
}
