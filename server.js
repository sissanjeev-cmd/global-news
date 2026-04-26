// server.js — Global News Aggregator backend
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const NodeCache = require("node-cache");
const path = require("path");
const { fetchAllSources } = require("./fetcher");
const { classifyArticles } = require("./classifier");
const { SOURCES, CROSS_SECTIONS } = require("./sources");

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 900; // 15 minutes

// Cache: key → value, TTL in seconds
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 60 });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Helper: group articles by source ──────────────────────────────
function groupBySource(articles) {
  const map = {};
  SOURCES.forEach((s) => {
    map[s.id] = { ...s, articles: [] };
  });
  articles.forEach((article) => {
    if (map[article.source_id]) {
      map[article.source_id].articles.push(article);
    }
  });
  return Object.values(map).filter((s) => s.articles.length > 0);
}

// ── Helper: build cross-section groups ────────────────────────────
function buildCrossSections(articles) {
  return CROSS_SECTIONS.map((section) => ({
    ...section,
    articles: articles
      .filter((a) => a.cross_sections && a.cross_sections.includes(section.id))
      .slice(0, 30),
  }));
}

// ── Core data pipeline ────────────────────────────────────────────
async function refreshNews() {
  console.log("[Server] Starting news refresh pipeline...");
  const start = Date.now();

  try {
    // 1. Fetch all RSS feeds
    const articles = await fetchAllSources();

    // 2. Classify articles via AI (or keyword fallback)
    console.log("[Server] Classifying articles...");
    const classifications = await classifyArticles(articles);

    // 3. Attach classifications
    articles.forEach((article) => {
      article.cross_sections = classifications[article.id] || [];
    });

    // 4. Sort all articles by published_at descending
    articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    // 5. Build response payload
    const payload = {
      last_updated: new Date().toISOString(),
      total_articles: articles.length,
      sources: groupBySource(articles),
      cross_sections: buildCrossSections(articles),
      meta: {
        source_count: SOURCES.length,
        cross_section_count: CROSS_SECTIONS.length,
      },
    };

    // 6. Cache the result
    cache.set("news", payload);
    console.log(`[Server] Refresh complete: ${articles.length} articles in ${Date.now() - start}ms`);
    return payload;
  } catch (err) {
    console.error("[Server] Pipeline error:", err);
    throw err;
  }
}

// ── API Routes ────────────────────────────────────────────────────

// GET /api/news — main data endpoint
app.get("/api/news", async (req, res) => {
  try {
    const cached = cache.get("news");
    if (cached) {
      return res.json({ ...cached, from_cache: true });
    }
    const fresh = await refreshNews();
    res.json({ ...fresh, from_cache: false });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch news",
      message: err.message,
      last_updated: null,
    });
  }
});

// GET /api/refresh — force refresh (bypass cache)
app.get("/api/refresh", async (req, res) => {
  try {
    cache.del("news");
    const fresh = await refreshNews();
    res.json({ ...fresh, from_cache: false, forced: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sources — list all configured sources
app.get("/api/sources", (req, res) => {
  res.json({ sources: SOURCES, cross_sections: CROSS_SECTIONS });
});

// GET /api/health — health check
app.get("/api/health", (req, res) => {
  const cached = cache.get("news");
  res.json({
    status: "ok",
    cached: !!cached,
    last_updated: cached ? cached.last_updated : null,
    cache_ttl: CACHE_TTL,
    uptime: process.uptime(),
  });
});

// Catch-all → serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start server ──────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🌍 Global News Aggregator running on http://localhost:${PORT}`);
  console.log(`   Cache TTL: ${CACHE_TTL}s (${CACHE_TTL / 60} minutes)`);
  console.log(`   Sources: ${SOURCES.length} | Sections: ${CROSS_SECTIONS.length}`);
  console.log(`   AI Classification: ${process.env.ANTHROPIC_API_KEY ? "✓ Enabled" : "⚠ Fallback (no API key)"}\n`);

  // Pre-warm cache on startup
  try {
    await refreshNews();
  } catch (err) {
    console.error("[Server] Pre-warm failed:", err.message);
  }
});

module.exports = app;
