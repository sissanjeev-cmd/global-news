// sources.js — All RSS feed definitions for Global News Aggregator

const SOURCES = [
  // ── US Newspapers ──────────────────────────────────────────────
  {
    id: "nyt",
    name: "The New York Times",
    region: "US",
    category: "Newspaper",
    feeds: [
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", label: "Top Stories" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", label: "World" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", label: "Technology" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", label: "Business" },
    ],
  },
  {
    id: "wapo",
    name: "The Washington Post",
    region: "US",
    category: "Newspaper",
    feeds: [
      { url: "https://feeds.washingtonpost.com/rss/world", label: "World" },
      { url: "https://feeds.washingtonpost.com/rss/business/technology", label: "Technology" },
      { url: "https://feeds.washingtonpost.com/rss/business", label: "Business" },
    ],
  },
  {
    id: "wsj",
    name: "The Wall Street Journal",
    region: "US",
    category: "Newspaper",
    feeds: [
      { url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", label: "World" },
      { url: "https://feeds.a.dj.com/rss/RSSWSJD.xml", label: "Tech" },
      { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", label: "Markets" },
    ],
  },

  // ── UK / International ─────────────────────────────────────────
  {
    id: "guardian",
    name: "The Guardian",
    region: "UK",
    category: "Newspaper",
    feeds: [
      { url: "https://www.theguardian.com/world/rss", label: "World" },
      { url: "https://www.theguardian.com/technology/rss", label: "Technology" },
      { url: "https://www.theguardian.com/business/rss", label: "Business" },
    ],
  },
  {
    id: "bbc",
    name: "BBC News",
    region: "UK",
    category: "Broadcaster",
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/rss.xml", label: "Top Stories" },
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", label: "World" },
      { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", label: "Technology" },
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", label: "Business" },
    ],
  },

  // ── US Broadcasters ────────────────────────────────────────────
  {
    id: "cnn",
    name: "CNN",
    region: "US",
    category: "Broadcaster",
    feeds: [
      { url: "http://rss.cnn.com/rss/edition.rss", label: "Top Stories" },
      { url: "http://rss.cnn.com/rss/edition_world.rss", label: "World" },
      { url: "http://rss.cnn.com/rss/edition_technology.rss", label: "Technology" },
      { url: "http://rss.cnn.com/rss/money_news_international.rss", label: "Business" },
    ],
  },
  {
    id: "fox",
    name: "Fox News",
    region: "US",
    category: "Broadcaster",
    feeds: [
      { url: "https://moxie.foxnews.com/google-publisher/world.xml", label: "World" },
      { url: "https://moxie.foxnews.com/google-publisher/tech.xml", label: "Technology" },
      { url: "https://moxie.foxnews.com/google-publisher/business.xml", label: "Business" },
    ],
  },

  // ── Middle East / Africa ───────────────────────────────────────
  {
    id: "aljazeera",
    name: "Al Jazeera",
    region: "Middle East",
    category: "Broadcaster",
    feeds: [
      { url: "https://www.aljazeera.com/xml/rss/all.xml", label: "All News" },
    ],
  },

  // ── Europe ─────────────────────────────────────────────────────
  {
    id: "france24",
    name: "France 24",
    region: "Europe",
    category: "Broadcaster",
    feeds: [
      { url: "https://www.france24.com/en/rss", label: "Top Stories" },
      { url: "https://www.france24.com/en/business/rss", label: "Business" },
      { url: "https://www.france24.com/en/technology/rss", label: "Tech" },
    ],
  },
  {
    id: "dw",
    name: "DW News",
    region: "Europe",
    category: "Broadcaster",
    feeds: [
      { url: "https://rss.dw.com/xml/rss-en-world", label: "World" },
      { url: "https://rss.dw.com/xml/rss-en-top", label: "Top Stories" },
      { url: "https://rss.dw.com/xml/rss_en_business", label: "Business" },
    ],
  },
  {
    id: "spiegel",
    name: "Der Spiegel",
    region: "Europe",
    category: "Magazine",
    feeds: [
      { url: "https://www.spiegel.de/international/index.rss", label: "International" },
    ],
  },

  // ── Magazines / Weekly ─────────────────────────────────────────
  {
    id: "time",
    name: "Time",
    region: "US",
    category: "Magazine",
    feeds: [
      { url: "https://time.com/feed/", label: "Top Stories" },
    ],
  },
  {
    id: "economist",
    name: "The Economist",
    region: "UK",
    category: "Magazine",
    feeds: [
      { url: "https://www.economist.com/the-world-this-week/rss.xml", label: "World This Week" },
      { url: "https://www.economist.com/leaders/rss.xml", label: "Leaders" },
      { url: "https://www.economist.com/business/rss.xml", label: "Business" },
      { url: "https://www.economist.com/science-and-technology/rss.xml", label: "Science & Tech" },
    ],
  },
  {
    id: "newsweek",
    name: "Newsweek",
    region: "US",
    category: "Magazine",
    feeds: [
      { url: "https://www.newsweek.com/rss", label: "Top Stories" },
    ],
  },
  {
    id: "newyorker",
    name: "The New Yorker",
    region: "US",
    category: "Magazine",
    feeds: [
      { url: "https://www.newyorker.com/feed/everything", label: "Everything" },
    ],
  },

  // ── India ──────────────────────────────────────────────────────
  {
    id: "ndtv",
    name: "NDTV",
    region: "India",
    category: "Broadcaster",
    feeds: [
      { url: "https://feeds.feedburner.com/ndtvnews-top-stories", label: "Top Stories" },
      { url: "https://feeds.feedburner.com/ndtvnews-world-news", label: "World" },
      { url: "https://feeds.feedburner.com/ndtvnews-tech-news", label: "Technology" },
    ],
  },
  {
    id: "aajtak",
    name: "Aaj Tak",
    region: "India",
    category: "Broadcaster",
    feeds: [
      { url: "https://www.aajtak.in/rss/world.xml", label: "World" },
      { url: "https://www.aajtak.in/rss/business.xml", label: "Business" },
    ],
  },
  {
    id: "indiatoday",
    name: "India Today",
    region: "India",
    category: "Magazine",
    feeds: [
      { url: "https://www.indiatoday.in/rss/home", label: "Home" },
      { url: "https://www.indiatoday.in/rss/1206513", label: "Technology" },
    ],
  },
  {
    id: "frontline",
    name: "Frontline",
    region: "India",
    category: "Magazine",
    feeds: [
      { url: "https://frontline.thehindu.com/rss/feeds/top-stories.xml", label: "Top Stories" },
    ],
  },
  {
    id: "toi",
    name: "The Times of India",
    region: "India",
    category: "Newspaper",
    feeds: [
      { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", label: "Top Stories" },
      { url: "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms", label: "World" },
      { url: "https://timesofindia.indiatimes.com/rssfeeds/5880659.cms", label: "Technology" },
    ],
  },
  {
    id: "dainikbhaskar",
    name: "Dainik Bhaskar",
    region: "India",
    category: "Newspaper",
    feeds: [
      { url: "https://www.bhaskar.com/rss-feed/1061/", label: "National" },
      { url: "https://www.bhaskar.com/rss-feed/1047/", label: "World" },
    ],
  },

  // ── Asia-Pacific ───────────────────────────────────────────────
  {
    id: "chinadaily",
    name: "China Daily",
    region: "Asia",
    category: "Newspaper",
    feeds: [
      { url: "https://www.chinadaily.com.cn/rss/world_rss.xml", label: "World" },
      { url: "https://www.chinadaily.com.cn/rss/bizchina_rss.xml", label: "Business" },
    ],
  },
  {
    id: "smh",
    name: "The Sydney Morning Herald",
    region: "Australia",
    category: "Newspaper",
    feeds: [
      { url: "https://www.smh.com.au/rss/feed.xml", label: "Top Stories" },
      { url: "https://www.smh.com.au/rss/technology/technology.xml", label: "Technology" },
      { url: "https://www.smh.com.au/rss/business.xml", label: "Business" },
    ],
  },
];

// Cross-source section definitions
const CROSS_SECTIONS = [
  {
    id: "tech",
    name: "IT & Tech",
    icon: "💻",
    keywords: [
      "technology", "software", "hardware", "cybersecurity", "data", "cloud",
      "semiconductor", "chip", "startup", "silicon valley", "app", "digital",
      "internet", "broadband", "5g", "quantum", "robotics", "automation",
      "programming", "developer", "coding", "open source", "linux", "microsoft",
      "apple", "google", "amazon", "meta", "nvidia", "intel", "amd",
    ],
  },
  {
    id: "jobcuts",
    name: "Global Job Cuts",
    icon: "📉",
    keywords: [
      "layoffs", "job cuts", "downsizing", "redundancies", "retrenchment",
      "workforce reduction", "mass firing", "employees laid off", "cut jobs",
      "restructuring", "headcount", "pink slip", "severance", "hiring freeze",
      "job losses", "unemployment", "job market", "recession layoffs",
    ],
  },
  {
    id: "ai",
    name: "LLM & AI Companies",
    icon: "🤖",
    keywords: [
      "openai", "anthropic", "claude", "chatgpt", "gpt", "gemini", "llama",
      "mistral", "cohere", "hugging face", "deepmind", "google ai", "meta ai",
      "artificial intelligence", "large language model", "llm", "generative ai",
      "foundation model", "transformer", "fine-tuning", "rag", "ai safety",
      "ai regulation", "ai governance", "machine learning", "neural network",
      "diffusion model", "stable diffusion", "midjourney", "ai agent",
      "agentic ai", "multimodal", "text-to-image", "ai startup",
    ],
  },
];

module.exports = { SOURCES, CROSS_SECTIONS };
