/**
 * Render the hand-authored architecture and ER SVGs to high-resolution PNGs.
 * Uses the locally installed Chrome through playwright-core — no remote service.
 *
 * Usage (from frontend/): node scripts/render-diagrams.mjs
 */
import { chromium } from "playwright-core";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const diagrams = [
  {
    svg: resolve(root, "infrastructure/architecture/aeropix-architecture.svg"),
    png: resolve(root, "infrastructure/architecture/aeropix-architecture.png"),
    width: 1600,
    height: 1040,
  },
  {
    svg: resolve(root, "infrastructure/architecture/er-diagram.svg"),
    png: resolve(root, "infrastructure/architecture/er-diagram.png"),
    width: 1520,
    height: 1040,
  },
  {
    svg: resolve(root, "infrastructure/architecture/upload-sequence.svg"),
    png: resolve(root, "infrastructure/architecture/upload-sequence.png"),
    width: 1600,
    height: 1010,
  },
  {
    svg: resolve(root, "infrastructure/architecture/presigned-delivery.svg"),
    png: resolve(root, "infrastructure/architecture/presigned-delivery.png"),
    width: 1600,
    height: 1010,
  },
];

const browser = await chromium.launch({ executablePath: chrome, headless: true });
try {
  for (const diagram of diagrams) {
    const context = await browser.newContext({
      viewport: { width: diagram.width, height: diagram.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(diagram.svg).href, { waitUntil: "load" });
    await page.waitForTimeout(400);
    await page.locator("svg").screenshot({ path: diagram.png });
    await context.close();
    console.log(`Rendered ${diagram.png}`);
  }
} finally {
  await browser.close();
}
