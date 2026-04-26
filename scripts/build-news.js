#!/usr/bin/env node
// scripts/build-news.js
// Runs in GitHub Actions: fetch all RSS feeds → AI classify → write public/news.json

require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { fetchAllSources } = require("../fetcher");
const { classifyArticles } = require("../classifier");
const { SOURCES, CROSS_SECTIONS } = require("../sources");

const OUT_FILE = path.join(__dirname, "..", "public", "news.json");

// ── Group articles by source ──────────────────────────────────
function groupBySource(articles) {
  const map = {};
  SOURCES.forEach((s) => { map[s.id] = { ...s, feeds: undefined, articles: [] }; });
  articles.forEach((a) => {
    if (map[a.source_id]) map[a.source_id].articles.push(a);
  });
  return Object.values(map).filter((s) => s.articles.length > 0);
}

// ── Build cross-section groups ────────────────────────────────
function buildCrossSections(articles) {
  return CROSS_SECTIONS.map((section) => ({
    ...section,
    keywords: undefined,          // strip verbose keyword list from output
    articles: articles
      .filter((a) => a.cross_sections && a.cross_sections.includes(section.id))
      .slice(0, 40),
  }));
}

// ── Load existing news.json for dedup ─────────────────────────
function loadExisting() {
  try {
    if (fs.existsSync(OUT_FILE)) {
      const raw = fs.readFileSync(OUT_FILE, "utf8");
      const data = JSON.parse(raw);
      // Return set of article IDs we already have
      const ids = new Set();
      (data.sources || []).forEach((s) =>
        (s.articles || []).forEach((a) => ids.add(a.id))
      );
      return ids;
    }
  } catch (_) {}
  return new Set();
}

// ── Main pipeline ─────────────────────────────────────────────
async function main() {
  console.log("▶ Starting news build pipeline…");
  const start = Date.now();

  // 1. Load existing IDs to detect new articles
  const existingIds = loadExisting();
  console.log(`  Existing articles in cache: ${existingIds.size}`);

  // 2. Fetch all RSS feeds
  const articles = await fetchAllSources();
  console.log(`  Fetched: ${articles.length} articles`);

  const newArticles = articles.filter((a) => !existingIds.has(a.id));
  console.log(`  New articles (not yet classified): ${newArticles.length}`);

  // 3. Load existing data to merge classifications
  let existingData = null;
  try {
    if (fs.existsSync(OUT_FILE)) {
      existingData = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
    }
  } catch (_) {}

  // Build a map of existing classifications
  const existingClassifications = {};
  if (existingData) {
    (existingData.sources || []).forEach((s) =>
      (s.articles || []).forEach((a) => {
        existingClassifications[a.id] = a.cross_sections || [];
      })
    );
  }

  // 4. Classify only NEW articles (saves API tokens)
  let newClassifications = {};
  if (newArticles.length > 0) {
    console.log("  Running AI classification on new articles…");
    newClassifications = await classifyArticles(newArticles);
  }

  // 5. Merge classifications: existing + new
  articles.forEach((article) => {
    article.cross_sections =
      newClassifications[article.id] ??
      existingClassifications[article.id] ??
      [];
  });

  // 6. Sort by published_at descending
  articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  // 7. Build final payload
  const payload = {
    last_updated:       new Date().toISOString(),
    total_articles:     articles.length,
    new_this_run:       newArticles.length,
    sources:            groupBySource(articles),
    cross_sections:     buildCrossSections(articles),
    meta: {
      source_count:         SOURCES.length,
      cross_section_count:  CROSS_SECTIONS.length,
      build_duration_ms:    Date.now() - start,
      ai_enabled:           !!process.env.ANTHROPIC_API_KEY,
    },
  };

  // 8. Write public/news.json
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");

  console.log(`✓ news.json written — ${articles.length} articles, ${newArticles.length} new`);
  console.log(`  Build time: ${Date.now() - start}ms`);
  console.log(`  Output: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("✗ Build failed:", err);
  process.exit(1);
});
