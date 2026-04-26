#!/usr/bin/env node
// scripts/build-news.js
require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { fetchAllSources } = require("../fetcher");
const { classifyArticles } = require("../classifier");
const { SOURCES, CROSS_SECTIONS } = require("../sources");

const OUT_FILE = path.join(__dirname, "..", "public", "news.json");

// Paywall / invalid signals — skip these articles entirely
const PAYWALL_SIGNALS = [
  "subscribe to read", "subscribe to unlock", "subscription required",
  "subscribers only", "sign in to read", "login to read", "members only",
  "premium content", "unlock this article", "register to read",
  "to continue reading", "create a free account",
];

function isValid(article) {
  if (!article.title || article.title === "Untitled") return false;
  if (article.title.trim().length < 8) return false;
  if (!article.article_url || !article.article_url.startsWith("http")) return false;
  const text = `${article.title} ${article.summary || ""}`.toLowerCase();
  if (PAYWALL_SIGNALS.some(s => text.includes(s))) return false;
  return true;
}

// Group by source — each source appears ONCE, articles deduplicated by id
function groupBySource(articles) {
  const map = {};
  SOURCES.forEach(s => { map[s.id] = { id:s.id, name:s.name, region:s.region, category:s.category, articles:[] }; });
  const seen = new Set();
  articles.forEach(a => {
    if (!map[a.source_id]) return;
    if (seen.has(a.id)) return;
    seen.add(a.id);
    map[a.source_id].articles.push(a);
  });
  return Object.values(map).filter(s => s.articles.length > 0);
}

// Cross-sections: group articles by source within each section
function buildCrossSections(articles) {
  return CROSS_SECTIONS.map(section => {
    const matching = articles.filter(a => a.cross_sections?.includes(section.id));
    // Group by source within the section
    const bySource = {};
    matching.forEach(a => {
      if (!bySource[a.source_id]) {
        bySource[a.source_id] = { source_id:a.source_id, source_name:a.source_name, articles:[] };
      }
      bySource[a.source_id].articles.push(a);
    });
    return {
      id: section.id,
      name: section.name,
      icon: section.icon,
      total: matching.length,
      by_source: Object.values(bySource),  // grouped for frontend rendering
      articles: matching.slice(0, 40),      // flat list kept for compatibility
    };
  });
}

function loadExisting() {
  try {
    if (fs.existsSync(OUT_FILE)) {
      const data = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
      const ids = new Set();
      (data.sources||[]).forEach(s => (s.articles||[]).forEach(a => ids.add(a.id)));
      return ids;
    }
  } catch(_) {}
  return new Set();
}

async function main() {
  const GLOBAL_TIMEOUT = setTimeout(() => {
    console.warn("⚠ Global timeout — writing partial results");
    process.exit(0);
  }, 4.5 * 60 * 1000);
  GLOBAL_TIMEOUT.unref();

  console.log("▶ Starting news build pipeline…");
  const start = Date.now();

  const existingIds = loadExisting();
  console.log(`  Existing articles in cache: ${existingIds.size}`);

  // Fetch
  const rawArticles = await fetchAllSources();
  console.log(`  Fetched raw: ${rawArticles.length} articles`);

  // Filter invalid / paywalled
  const articles = rawArticles.filter(isValid);
  console.log(`  After filtering: ${articles.length} articles (removed ${rawArticles.length - articles.length})`);

  const newArticles = articles.filter(a => !existingIds.has(a.id));
  console.log(`  New articles (not yet classified): ${newArticles.length}`);

  // Load existing classifications
  let existingClassifications = {};
  try {
    if (fs.existsSync(OUT_FILE)) {
      const d = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
      (d.sources||[]).forEach(s => (s.articles||[]).forEach(a => {
        existingClassifications[a.id] = a.cross_sections || [];
      }));
    }
  } catch(_) {}

  // Classify only new
  let newClassifications = {};
  if (newArticles.length > 0) {
    console.log("  Running AI classification on new articles…");
    newClassifications = await classifyArticles(newArticles);
  }

  // Merge classifications
  articles.forEach(a => {
    a.cross_sections = newClassifications[a.id] ?? existingClassifications[a.id] ?? [];
  });

  // Sort newest first
  articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  const payload = {
    last_updated:   new Date().toISOString(),
    total_articles: articles.length,
    new_this_run:   newArticles.length,
    sources:        groupBySource(articles),
    cross_sections: buildCrossSections(articles),
    meta: {
      source_count:        SOURCES.length,
      cross_section_count: CROSS_SECTIONS.length,
      build_duration_ms:   Date.now() - start,
      ai_enabled:          !!process.env.ANTHROPIC_API_KEY,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`✓ news.json written — ${articles.length} articles, ${newArticles.length} new`);
  console.log(`  Build time: ${Date.now() - start}ms`);
}

main().catch(err => { console.error("✗ Build failed:", err); process.exit(1); });
