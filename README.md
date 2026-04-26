# 🌐 Global News Aggregator

A responsive, AI-classified news aggregator that pulls live headlines from **24 global sources** — grouped by outlet and intelligently cross-classified into thematic sections using the Anthropic Claude API.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **24 Sources** | NYT, WaPo, WSJ, Guardian, BBC, CNN, Fox, Al Jazeera, France 24, DW, Der Spiegel, Time, Economist, Newsweek, New Yorker, NDTV, Aaj Tak, India Today, Frontline, ToI, Dainik Bhaskar, China Daily, SMH |
| **AI Classification** | Anthropic Claude classifies each article into IT & Tech / Job Cuts / LLM & AI |
| **RSS Aggregation** | Fetches directly from official RSS feeds — no API keys for sources needed |
| **Auto-refresh** | Every 15 minutes with no duplicates |
| **Dark / Light mode** | Persistent per-user, toggle in header |
| **Responsive UI** | Card/grid layout works on mobile, tablet, desktop |
| **Caching** | Server-side NodeCache (15 min TTL) — survives burst traffic |
| **Error handling** | Per-feed fallback, keyword classifier backup when no Anthropic key |
| **Modular** | Easy to add/remove sources in `sources.js` |

---

## 🗂️ Project Structure

```
global-news/
├── server.js          # Express backend — API routes, cache, pipeline
├── fetcher.js         # RSS fetching + article normalization
├── classifier.js      # Anthropic AI classifier (+ keyword fallback)
├── sources.js         # All 24 source definitions + cross-section config
├── public/
│   ├── index.html     # Single-page app shell
│   ├── style.css      # Dark/light theme, responsive grid
│   └── app.js         # Frontend: fetch, render, tabs, auto-refresh
├── Dockerfile         # Production Docker image (Node 20 Alpine)
├── docker-compose.yml # Local Docker dev
├── railway.json       # Railway.app deployment config
├── .env.example       # Environment variable template
└── package.json
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js ≥ 18
- An [Anthropic API key](https://console.anthropic.com) *(optional — keyword fallback works without it)*

### 1. Clone & install

```bash
git clone https://github.com/sissanjeev-cmd/global-news.git
cd global-news
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

**.env file:**
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
CACHE_TTL=900
```

### 3. Run

```bash
npm start
# → http://localhost:3000
```

**Dev mode (auto-reload):**
```bash
npm run dev
```

---

## 🐳 Docker

### Build & run

```bash
docker compose up --build
```

### Or with Docker directly

```bash
docker build -t global-news .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... global-news
```

---

## ☁️ Deploy to Railway

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select `sissanjeev-cmd/global-news`
4. Add environment variable: `ANTHROPIC_API_KEY=sk-ant-...`
5. Railway auto-detects `railway.json` and deploys

> The `railway.json` sets the start command and healthcheck path (`/api/health`).

---

## 🔌 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/news` | Main feed — returns cached or fresh data |
| `GET /api/refresh` | Force refresh (bypass cache) |
| `GET /api/sources` | List all configured sources + sections |
| `GET /api/health` | Health check — uptime, cache status |

### Sample `/api/news` response shape

```json
{
  "last_updated": "2025-01-01T12:00:00Z",
  "total_articles": 487,
  "from_cache": true,
  "sources": [
    {
      "id": "nyt",
      "name": "The New York Times",
      "region": "US",
      "category": "Newspaper",
      "articles": [
        {
          "id": "nyt-abc123",
          "source_id": "nyt",
          "source_name": "The New York Times",
          "title": "Article headline here",
          "summary": "Brief summary...",
          "image_url": "https://...",
          "article_url": "https://nytimes.com/...",
          "published_at": "2025-01-01T10:00:00Z",
          "feed_label": "World",
          "cross_sections": ["tech"]
        }
      ]
    }
  ],
  "cross_sections": [
    {
      "id": "tech",
      "name": "IT & Tech",
      "icon": "💻",
      "articles": [ ... ]
    },
    {
      "id": "jobcuts",
      "name": "Global Job Cuts",
      "icon": "📉",
      "articles": [ ... ]
    },
    {
      "id": "ai",
      "name": "LLM & AI Companies",
      "icon": "🤖",
      "articles": [ ... ]
    }
  ]
}
```

---

## ➕ Adding a New Source

Edit `sources.js` and add an entry to the `SOURCES` array:

```js
{
  id: "reuters",           // unique slug
  name: "Reuters",         // display name
  region: "UK",            // US | UK | India | Europe | Asia | Australia | Middle East
  category: "Broadcaster", // Newspaper | Broadcaster | Magazine
  feeds: [
    { url: "https://feeds.reuters.com/reuters/topNews", label: "Top Stories" },
    { url: "https://feeds.reuters.com/reuters/technologyNews", label: "Technology" },
  ],
},
```

No other changes needed. The frontend auto-renders new sources.

---

## 🤖 AI Classification Details

- Articles are sent to **Claude claude-sonnet-4-20250514** in batches of 20
- Each article is classified into 0 or more of: `tech`, `jobcuts`, `ai`
- If `ANTHROPIC_API_KEY` is missing, the app automatically falls back to keyword matching
- Classification results are cached with the article data (15 min TTL)

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(none)* | Anthropic API key for AI classification |
| `PORT` | `3000` | HTTP server port |
| `CACHE_TTL` | `900` | Cache TTL in seconds (15 min) |

---

## 🛠️ Tech Stack

- **Backend:** Node.js 20 + Express 4
- **RSS Parsing:** `rss-parser`
- **AI:** `@anthropic-ai/sdk` (Claude claude-sonnet-4-20250514)
- **Cache:** `node-cache` (in-memory)
- **Frontend:** Vanilla JS (no framework), CSS custom properties
- **Fonts:** Playfair Display + IBM Plex Sans + IBM Plex Mono
- **Deploy:** Railway / Docker

---

## 📄 License

MIT © [sissanjeev-cmd](https://github.com/sissanjeev-cmd)
