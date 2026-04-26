# 🌐 Global News Aggregator

A responsive, AI-classified news aggregator — **100% GitHub hosted**. No server, no hosting costs.

- **GitHub Actions** fetches 23 sources (57 RSS feeds) every 15 minutes and writes `news.json`
- **Anthropic Claude** classifies articles into IT & Tech / Job Cuts / LLM & AI
- **GitHub Pages** serves the static frontend that reads `news.json`

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  GitHub Actions (every 15 min)               │
│  scripts/build-news.js                       │
│  → Fetch 57 RSS feeds                        │
│  → AI classify via Anthropic API             │
│  → Write public/news.json                    │
│  → Commit & push                             │
└──────────────────┬──────────────────────────┘
                   │ git push
┌──────────────────▼──────────────────────────┐
│  GitHub Pages                                │
│  public/index.html + style.css + app.js      │
│  app.js fetches news.json every 15 min       │
└─────────────────────────────────────────────┘
```

---

## Setup (one-time)

### 1. Fork / clone
```bash
git clone https://github.com/sissanjeev-cmd/global-news.git
cd global-news
npm install
```

### 2. Add Anthropic API key to GitHub Secrets
1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `ANTHROPIC_API_KEY` · Value: `sk-ant-...`

> Without this, classification falls back to keyword matching (still works).

### 3. Enable GitHub Pages
1. Repo → **Settings → Pages**
2. Source: **GitHub Actions**
3. Save

### 4. Enable GitHub Actions
1. Repo → **Actions** tab
2. Click **Enable Actions** if prompted
3. Click **Fetch & Deploy News** → **Run workflow** to trigger the first build

Your site will be live at:
```
https://sissanjeev-cmd.github.io/global-news/
```

---

## File Structure

```
global-news/
├── .github/
│   └── workflows/
│       └── fetch-news.yml     # Cron job: fetch + classify + deploy
├── scripts/
│   └── build-news.js          # Node script: RSS → classify → news.json
├── public/
│   ├── index.html             # App shell
│   ├── style.css              # Dark/light theme, responsive grid
│   ├── app.js                 # Frontend: reads news.json, renders UI
│   └── news.json              # Auto-generated — do not edit manually
├── fetcher.js                 # RSS fetching + normalization
├── classifier.js              # Anthropic AI classifier + keyword fallback
├── sources.js                 # All 23 source + cross-section definitions
├── package.json
└── .env.example
```

---

## Local Development

```bash
cp .env.example .env       # add ANTHROPIC_API_KEY
npm run build              # fetches RSS + writes public/news.json
npx serve public           # preview at http://localhost:3000
```

---

## Adding a Source

Edit `sources.js`:
```js
{
  id: "reuters",
  name: "Reuters",
  region: "UK",
  category: "Broadcaster",
  feeds: [
    { url: "https://feeds.reuters.com/reuters/topNews", label: "Top Stories" },
  ],
},
```
Push — the next Actions run picks it up automatically.

---

## Cross-Section Classification

| Section | ID | Examples |
|---|---|---|
| 💻 IT & Tech | `tech` | Chips, cloud, software, startups |
| 📉 Global Job Cuts | `jobcuts` | Layoffs, redundancies, restructuring |
| 🤖 LLM & AI | `ai` | OpenAI, Anthropic, Gemini, LLMs |

Classification uses **Claude claude-sonnet-4-20250514** in batches of 20 articles. Falls back to keyword matching when no API key is set.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub Secret | Powers AI classification |

---

## Tech Stack

- **CI/CD:** GitHub Actions (cron schedule)
- **Frontend:** Vanilla JS, CSS custom properties, GitHub Pages
- **RSS:** `rss-parser` (Node.js)
- **AI:** `@anthropic-ai/sdk` (Claude claude-sonnet-4-20250514)
- **Fonts:** Playfair Display × IBM Plex Sans

---

MIT © [sissanjeev-cmd](https://github.com/sissanjeev-cmd)
