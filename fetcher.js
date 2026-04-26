// fetcher.js — RSS feed fetching, parsing, and normalization

const Parser = require("rss-parser");
const { SOURCES } = require("./sources");
const { v4: uuidv4 } = require("crypto");

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
      ["enclosure", "enclosure"],
      ["dc:creator", "creator"],
    ],
  },
});

// Simple ID generator from title + source
function generateId(sourceId, title) {
  const base = `${sourceId}-${title}`.replace(/\s+/g, "-").toLowerCase();
  return Buffer.from(base).toString("base64").slice(0, 24).replace(/[^a-zA-Z0-9]/g, "x");
}

// Extract image URL from various RSS item formats
function extractImage(item) {
  // Try media:content
  if (item.mediaContent) {
    const mc = item.mediaContent;
    if (typeof mc === "object" && mc.$) return mc.$.url;
    if (typeof mc === "string") return mc;
  }
  // Try media:thumbnail
  if (item.mediaThumbnail) {
    const mt = item.mediaThumbnail;
    if (typeof mt === "object" && mt.$) return mt.$.url;
    if (typeof mt === "string") return mt;
  }
  // Try enclosure
  if (item.enclosure && item.enclosure.url) {
    if (/\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url)) {
      return item.enclosure.url;
    }
  }
  // Try itunes image
  if (item.itunes && item.itunes.image) return item.itunes.image;
  // Try content for embedded images
  if (item.content) {
    const match = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) return match[1];
  }
  if (item["content:encoded"]) {
    const match = item["content:encoded"].match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) return match[1];
  }
  return null;
}

// Strip HTML tags from summary
function stripHtml(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/&[a-zA-Z]+;/g, " ").trim();
}

// Normalize a single RSS item into our standard article shape
function normalizeItem(item, source, feedLabel) {
  const title = stripHtml(item.title || "Untitled");
  const summary = stripHtml(item.contentSnippet || item.summary || item.description || "").slice(0, 300);
  const article_url = item.link || item.guid || "";
  const image_url = extractImage(item);
  const published_at = item.pubDate || item.isoDate || new Date().toISOString();
  const id = generateId(source.id, title);

  return {
    id,
    source_id: source.id,
    source_name: source.name,
    source_region: source.region,
    source_category: source.category,
    feed_label: feedLabel,
    title,
    summary,
    image_url,
    article_url,
    published_at,
    cross_sections: [], // filled in by classifier
  };
}

// Hard timeout wrapper — kills hung feeds after N ms
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// Fetch a single RSS feed
async function fetchFeed(source, feed) {
  try {
    const parsed = await withTimeout(parser.parseURL(feed.url), 7000, `${source.name}/${feed.label}`);
    const items = (parsed.items || []).slice(0, 8); // top 8 per feed
    return items.map((item) => normalizeItem(item, source, feed.label));
  } catch (err) {
    console.warn(`[Fetcher] Failed: ${source.name} / ${feed.label} — ${err.message}`);
    return [];
  }
}

// Fetch all sources concurrently with concurrency limit
async function fetchAllSources(concurrency = 10) {
  console.log(`[Fetcher] Starting fetch for ${SOURCES.length} sources...`);

  // Flatten all (source, feed) pairs
  const tasks = [];
  SOURCES.forEach((source) => {
    source.feeds.forEach((feed) => tasks.push({ source, feed }));
  });

  const results = [];
  const seen = new Set();

  // Process in chunks
  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(({ source, feed }) => fetchFeed(source, feed)));
    chunkResults.flat().forEach((article) => {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        results.push(article);
      }
    });
  }

  console.log(`[Fetcher] Fetched ${results.length} unique articles`);
  return results;
}

module.exports = { fetchAllSources };
