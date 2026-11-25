/**
 * AEROPIX — genuine local-mode screenshot capture.
 *
 * Runs the real production build in Chrome against the real FastAPI backend.
 * Captures screenshots into ../docs/screenshots and records console errors.
 * No mockups, no fabricated cloud evidence.
 *
 * Usage (from frontend/):  node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../../docs/screenshots");
const BASE = process.env.AEROPIX_BASE ?? "http://localhost:4173";
const API = process.env.AEROPIX_API ?? "http://127.0.0.1:8000/api";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEMO_EMAIL = "demo@aeropix.app";
const DEMO_PASSWORD = "AeropixDemo123!";

mkdirSync(OUT, { recursive: true });

const report = { base: BASE, startedAt: new Date().toISOString(), shots: [], consoleErrors: [], checks: [] };
const check = (name, pass, detail = "") => {
  report.checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

async function apiLogin() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`API login failed: ${res.status}`);
  return res.json();
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") {
      report.consoleErrors.push({ url: page.url(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    report.consoleErrors.push({ url: page.url(), text: `PAGEERROR: ${error.message}` });
  });

  const auth = await apiLogin();

  const shot = async (name, { fullPage = false, wait = 900, scrollThrough = false } = {}) => {
    if (scrollThrough) {
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewport = page.viewportSize()?.height ?? 900;
      for (let y = 0; y < height; y += Math.round(viewport * 0.72)) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(130);
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(700);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(wait);
    await page.screenshot({ path: resolve(OUT, name), fullPage });
    report.shots.push(name);
    console.log(`  saved ${name}`);
  };

  const go = async (path, selector) => {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    if (selector) await page.waitForSelector(selector, { timeout: 15000 });
  };

  /* ---------------- public pages ---------------- */

  await go("/", ".hero__title");
  check("Landing hero renders", await page.locator(".hero__title").isVisible());
  const heroImgCount = await page.locator(".hero__visual svg").count();
  check("Hero illustration present", heroImgCount > 0);
  await shot("01-landing.png", { fullPage: true, wait: 1200, scrollThrough: true });

  await go("/login", "#login-email");
  await shot("02-login.png", { fullPage: true });

  await go("/register", "form");
  await shot("03-register.png", { fullPage: true });

  await go("/this-page-does-not-exist", ".not-found");
  check("404 page renders", await page.locator(".not-found").isVisible());
  await shot("04-not-found.png");

  /* ---------------- authenticated app ---------------- */

  await go("/login", "#login-email");
  await page.click(".demo-credentials");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app", { timeout: 20000 });
  await page.waitForSelector(".stat-card", { timeout: 20000 });
  check("Demo login reaches dashboard", page.url().endsWith("/app"));

  const statCards = await page.locator(".stat-card").count();
  check("Dashboard stat cards rendered", statCards >= 4, `${statCards} cards`);

  const chartSvgs = await page.locator(".recharts-surface").count();
  check("Recharts charts rendered", chartSvgs >= 2, `${chartSvgs} chart surfaces`);

  const brokenImages = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.src),
  );
  check("No broken images on dashboard", brokenImages.length === 0, brokenImages.join(", "));

  await shot("05-dashboard.png", { fullPage: true, wait: 1500 });

  await go("/app/gallery", ".image-card");
  const cardCount = await page.locator(".image-card").count();
  check("Gallery renders demo images", cardCount === 8, `${cardCount} cards`);
  await page.waitForTimeout(1200);
  await shot("06-gallery-masonry.png", { fullPage: true });

  await page.locator(".image-card__trigger").first().click();
  await page.waitForSelector(".lightbox", { timeout: 10000 });
  await page.waitForTimeout(900);
  check("Lightbox opens from gallery", await page.locator(".lightbox").isVisible());
  await shot("07-gallery-lightbox.png");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".lightbox", { state: "detached", timeout: 10000 });

  await page.getByRole("button", { name: "Grid layout" }).click();
  await page.waitForTimeout(600);
  await shot("08-gallery-grid.png");

  await page.getByRole("button", { name: "List layout" }).click();
  await page.waitForTimeout(600);
  await shot("09-gallery-list.png");

  await go("/app/upload", ".dropzone");
  await shot("10-upload-empty.png", { fullPage: true });

  // Genuine upload through the real UI -> FastAPI -> local storage backend.
  const uploadFile = resolve(here, "../public/demo/demo-05.jpg");
  await page.setInputFiles('input[type="file"]', uploadFile);
  await page.waitForSelector(".upload-row", { timeout: 10000 });
  const uploadButton = page.locator(".upload-queue__footer button.btn--primary");
  await uploadButton.click();
  await page.waitForSelector(".upload-row--success", { timeout: 30000 });
  await page.waitForTimeout(700);
  check("Real upload succeeds through UI", await page.locator(".upload-row--success").count() === 1);
  await shot("11-upload-success.png", { fullPage: true });

  // Remove the test upload so the rest of the library stays at the seeded 8 images.
  const afterUpload = await (
    await fetch(`${API}/images?limit=50`, {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    })
  ).json();
  const uploaded = afterUpload.items.filter((image) => image.original_filename === "demo-05.jpg" && !image.is_demo);
  for (const image of uploaded) {
    await fetch(`${API}/images/${image.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
  }
  check("Uploaded test image cleaned up", uploaded.length === 1, `${uploaded.length} removed`);

  await go("/app/albums", ".album-card");
  const albumCount = await page.locator(".album-card").count();
  check("Albums page lists albums", albumCount === 3, `${albumCount} albums`);
  await page.waitForTimeout(1000);
  await shot("12-albums.png", { fullPage: true });

  await go("/app/albums/1", ".album-hero");
  check("Album detail renders", await page.locator(".album-hero").isVisible());
  await page.waitForTimeout(900);
  await shot("13-album-detail.png", { fullPage: true });

  await go("/app/images/1", ".image-detail-panel");
  check("Image detail renders", await page.locator(".image-detail-panel").isVisible());
  await page.waitForTimeout(900);
  await shot("14-image-detail.png", { fullPage: true });

  await go("/app/settings", ".settings-panel");
  check("Settings page renders", await page.locator(".settings-panel").first().isVisible());
  await shot("15-settings.png", { fullPage: true, wait: 1200 });

  // Mobile layout
  await page.setViewportSize({ width: 390, height: 844 });
  await go("/app", ".stat-card");
  await page.waitForTimeout(900);
  await shot("16-mobile-dashboard.png", { fullPage: true, scrollThrough: true });

  await context.close();

  /* ---------------- dark theme ---------------- */

  const darkContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: "reduce",
  });
  await darkContext.addInitScript(
    ({ token }) => {
      try {
        localStorage.setItem("aeropix.token", token);
        localStorage.setItem("aeropix.theme", "dark");
      } catch {
        /* noop */
      }
    },
    { token: auth.access_token },
  );
  const darkPage = await darkContext.newPage();
  darkPage.on("console", (message) => {
    if (message.type() === "error") {
      report.consoleErrors.push({ url: darkPage.url(), text: message.text() });
    }
  });
  darkPage.on("pageerror", (error) => {
    report.consoleErrors.push({ url: darkPage.url(), text: `PAGEERROR: ${error.message}` });
  });

  const darkScroll = async () => {
    const height = await darkPage.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 700) {
      await darkPage.evaluate((top) => window.scrollTo(0, top), y);
      await darkPage.waitForTimeout(120);
    }
    await darkPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await darkPage.waitForTimeout(500);
    await darkPage.evaluate(() => window.scrollTo(0, 0));
    await darkPage.waitForTimeout(300);
  };

  await darkPage.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await darkPage.waitForSelector(".stat-card", { timeout: 20000 });
  await darkPage.waitForTimeout(900);
  const themeAttr = await darkPage.evaluate(() => document.documentElement.dataset.theme);
  check("Dark theme applies", themeAttr === "dark", `data-theme=${themeAttr}`);
  await darkScroll();
  await darkPage.screenshot({ path: resolve(OUT, "17-dashboard-dark.png"), fullPage: true });
  report.shots.push("17-dashboard-dark.png");

  await darkPage.goto(`${BASE}/app/gallery`, { waitUntil: "networkidle" });
  await darkPage.waitForSelector(".image-card", { timeout: 20000 });
  await darkPage.waitForTimeout(900);
  await darkScroll();
  await darkPage.screenshot({ path: resolve(OUT, "18-gallery-dark.png"), fullPage: true });
  report.shots.push("18-gallery-dark.png");

  await darkContext.close();

  check("No browser console errors", report.consoleErrors.length === 0, `${report.consoleErrors.length} errors`);
} catch (error) {
  report.fatal = String(error && error.stack ? error.stack : error);
  console.error("CAPTURE FAILED:", error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`\nScreenshots saved to ${OUT}`);
  console.log(`Console errors: ${report.consoleErrors.length}`);
}
