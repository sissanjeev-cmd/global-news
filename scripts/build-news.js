#!/usr/bin/env node
require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { fetchAllSources } = require("../fetcher");
const { classifyArticles } = require("../classifier");
const { SOURCES, REGIONS, REGION_MAP, CROSS_SECTIONS } = require("../sources");

const OUT_FILE = path.join(__dirname, "..", "public", "news.json");

const PAYWALL_SIGNALS = [
  "subscribe to read","subscribe to unlock","subscription required",
  "subscribers only","sign in to read","login to read","members only",
  "premium content","unlock this article","register to read",
  "to continue reading","create a free account",
];

function isValid(a) {
  if (!a.title || a.title.trim().length < 8) return false;
  if (!a.article_url || !a.article_url.startsWith("http")) return false;
  const text = `${a.title} ${a.summary||""}`.toLowerCase();
  return !PAYWALL_SIGNALS.some(s => text.includes(s));
}

// Group by source — each source once, articles deduped
function groupBySource(articles) {
  const map = {};
  SOURCES.forEach(s => {
    map[s.id] = { id:s.id, name:s.name, region:s.region, category:s.category, articles:[] };
  });
  const seen = new Set();
  articles.forEach(a => {
    if (!map[a.source_id] || seen.has(a.id)) return;
    seen.add(a.id);
    map[a.source_id].articles.push(a);
  });
  return Object.values(map).filter(s => s.articles.length > 0);
}

// Group sources by region for sidebar
function groupByRegion(sources) {
  const regionOrder = REGIONS.map(r => r.id);
  const map = {};
  REGIONS.forEach(r => { map[r.id] = { ...r, sources:[] }; });
  sources.forEach(s => {
    const rid = REGION_MAP[s.region];
    if (rid && map[rid]) map[rid].sources.push({ id:s.id, name:s.name, count:s.articles.length });
  });
  return regionOrder.map(id => map[id]).filter(r => r.sources.length > 0);
}

function buildCrossSections(articles) {
  return CROSS_SECTIONS.map(section => ({
    id:section.id, name:section.name, icon:section.icon,
    articles: articles.filter(a => a.cross_sections?.includes(section.id)).slice(0,40),
  }));
}

function loadExistingIds() {
  try {
    if (fs.existsSync(OUT_FILE)) {
      const d = JSON.parse(fs.readFileSync(OUT_FILE,"utf8"));
      const ids = new Set();
      (d.sources||[]).forEach(s => (s.articles||[]).forEach(a => ids.add(a.id)));
      return ids;
    }
  } catch(_) {}
  return new Set();
}

function loadExistingClassifications() {
  try {
    if (fs.existsSync(OUT_FILE)) {
      const d = JSON.parse(fs.readFileSync(OUT_FILE,"utf8"));
      const map = {};
      (d.sources||[]).forEach(s => (s.articles||[]).forEach(a => { map[a.id] = a.cross_sections||[]; }));
      return map;
    }
  } catch(_) {}
  return {};
}

async function main() {
  const TIMEOUT = setTimeout(() => { console.warn("⚠ Timeout — writing partial results"); process.exit(0); }, 4.5*60*1000);
  TIMEOUT.unref();

  console.log("▶ Global Briefing build pipeline starting…");
  const start = Date.now();

  const existingIds = loadExistingIds();
  const existingCls = loadExistingClassifications();
  console.log(`  Cached: ${existingIds.size} articles`);

  const raw = await fetchAllSources();
  const articles = raw.filter(isValid);
  console.log(`  Fetched: ${raw.length} raw → ${articles.length} valid`);

  const newOnes = articles.filter(a => !existingIds.has(a.id));
  console.log(`  New to classify: ${newOnes.length}`);

  let newCls = {};
  if (newOnes.length > 0) newCls = await classifyArticles(newOnes);

  articles.forEach(a => { a.cross_sections = newCls[a.id] ?? existingCls[a.id] ?? []; });
  articles.sort((a,b) => new Date(b.published_at) - new Date(a.published_at));

  const sources = groupBySource(articles);
  const regions = groupByRegion(sources);

  const payload = {
    last_updated:   new Date().toISOString(),
    total_articles: articles.length,
    new_this_run:   newOnes.length,
    sources,
    regions,       // sidebar data
    cross_sections: buildCrossSections(articles),
    meta: {
      source_count: SOURCES.length,
      build_ms:     Date.now() - start,
      ai_enabled:   !!process.env.ANTHROPIC_API_KEY,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive:true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`✓ Done — ${articles.length} articles, ${newOnes.length} new, ${Date.now()-start}ms`);
}

main().catch(err => { console.error("✗ Failed:", err); process.exit(1); });
