/**
 * Visual QA helper. Uses the Chrome/Edge already installed on the machine,
 * so it never downloads a browser.
 *
 * Usage: node scripts/screenshots.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), ".shots");

const CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

async function findBrowser() {
  for (const candidate of CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // keep looking
    }
  }
  throw new Error("No Chrome or Edge executable found.");
}

const SHOTS = [
  { name: "home", url: "/", widths: [1440, 390] },
  { name: "trending", url: "/trending", widths: [1440] },
  { name: "new", url: "/new?window=30", widths: [1440] },
  { name: "gems", url: "/gems", widths: [1440] },
  { name: "topics", url: "/topics", widths: [1440] },
  { name: "search", url: "/search?q=self-hosted%20analytics", widths: [1440, 390], waitFor: "matches" },
  { name: "repo", url: "/repo/koala73/worldmonitor", widths: [1440, 390] },
  { name: "digest-index", url: "/digest", widths: [1440] },
  { name: "digest", url: "/digest/2026-W46", widths: [1440] },
  { name: "about", url: "/about", widths: [1440] },
];

const browser = await chromium.launch({
  executablePath: await findBrowser(),
  headless: true,
});

await fs.mkdir(OUT, { recursive: true });
const report = [];

for (const shot of SHOTS) {
  for (const width of shot.widths) {
    const context = await browser.newContext({
      viewport: { width, height: width < 500 ? 844 : 1000 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    try {
      await page.goto(`${BASE}${shot.url}`, { waitUntil: "networkidle", timeout: 90_000 });
      if (shot.waitFor) {
        await page.waitForFunction(
          (needle) => document.body.innerText.toLowerCase().includes(needle),
          shot.waitFor,
          { timeout: 30_000 },
        );
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);

      const suffix = width < 500 ? `${width}` : "desktop";
      const fold = path.join(OUT, `${shot.name}-${suffix}-fold.png`);
      const full = path.join(OUT, `${shot.name}-${suffix}-full.png`);
      await page.screenshot({ path: fold, fullPage: false });
      await page.screenshot({ path: full, fullPage: true });

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflow = doc.scrollWidth > window.innerWidth + 1;
        const offenders = [];
        if (overflow) {
          for (const element of document.querySelectorAll("body *")) {
            const rect = element.getBoundingClientRect();
            if (rect.right > window.innerWidth + 1 && rect.width > 8) {
              offenders.push({
                tag: element.tagName.toLowerCase(),
                className: String(element.className).slice(0, 100),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              });
            }
            if (offenders.length >= 8) break;
          }
        }
        return {
          title: document.title,
          height: doc.scrollHeight,
          width: doc.scrollWidth,
          viewport: window.innerWidth,
          overflow,
          offenders,
        };
      });

      report.push({ ...shot, width, errors, ...metrics });
    } catch (error) {
      report.push({ ...shot, width, failed: error.message, errors });
    }
    await context.close();
  }
}

await browser.close();
await fs.writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
