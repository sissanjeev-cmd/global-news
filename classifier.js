// classifier.js — AI-powered article classification using Anthropic API

const Anthropic = require("@anthropic-ai/sdk");
const { CROSS_SECTIONS } = require("./sources");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Batch size for classification to minimize API calls
const BATCH_SIZE = 20;

/**
 * Classify a batch of articles into cross-source sections.
 * Returns a map: articleId → [sectionId, ...]
 */
async function classifyArticles(articles) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[Classifier] No ANTHROPIC_API_KEY — falling back to keyword matching");
    return keywordFallback(articles);
  }

  const results = {};

  // Initialize all articles with empty arrays
  articles.forEach((a) => (results[a.id] = []));

  // Process in batches
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    try {
      const batchResults = await classifyBatch(batch);
      Object.assign(results, batchResults);
    } catch (err) {
      console.error(`[Classifier] Batch ${i / BATCH_SIZE + 1} failed:`, err.message);
      // Fallback for failed batch
      const fallback = keywordFallback(batch);
      Object.assign(results, fallback);
    }
  }

  return results;
}

async function classifyBatch(articles) {
  const sectionDescriptions = CROSS_SECTIONS.map(
    (s) => `"${s.id}": ${s.name} — ${s.keywords.slice(0, 10).join(", ")}`
  ).join("\n");

  const articleList = articles
    .map((a, idx) => `[${idx}] ID:${a.id} | ${a.title} | ${(a.summary || "").slice(0, 120)}`)
    .join("\n");

  const prompt = `You are a news classifier. For each article below, determine which of the following sections it belongs to (can be multiple, or none):

SECTIONS:
${sectionDescriptions}

ARTICLES:
${articleList}

Respond ONLY with a JSON object where keys are article IDs and values are arrays of matching section IDs.
Example: {"abc123": ["tech", "ai"], "def456": [], "ghi789": ["jobcuts"]}
Only include articles that match at least one section. Return valid JSON only, no explanation.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in classifier response");

  const parsed = JSON.parse(jsonMatch[0]);

  // Build full result map (include articles not in response as empty)
  const result = {};
  articles.forEach((a) => {
    result[a.id] = parsed[a.id] || [];
  });
  return result;
}

/**
 * Keyword-based fallback classifier (no API needed)
 */
function keywordFallback(articles) {
  const results = {};
  articles.forEach((article) => {
    const text = `${article.title} ${article.summary || ""}`.toLowerCase();
    const matched = [];
    CROSS_SECTIONS.forEach((section) => {
      if (section.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
        matched.push(section.id);
      }
    });
    results[article.id] = matched;
  });
  return results;
}

module.exports = { classifyArticles };
