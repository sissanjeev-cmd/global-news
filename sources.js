// sources.js — Global Briefing source definitions

const SOURCES = [

  // ── IT Focus ──────────────────────────────────────────────────
  { id:"techcrunch",   name:"TechCrunch",          region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://techcrunch.com/feed/", label:"Latest" }] },
  { id:"theverge",     name:"The Verge",            region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.theverge.com/rss/index.xml", label:"Latest" }] },
  { id:"wired",        name:"Wired",                region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.wired.com/feed/rss", label:"Latest" }] },
  { id:"arstechnica",  name:"Ars Technica",         region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"http://feeds.arstechnica.com/arstechnica/index", label:"Latest" }] },
  { id:"zdnet",        name:"ZDNet",                region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.zdnet.com/news/rss.xml", label:"Latest" }] },
  { id:"cnet",         name:"CNET",                 region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.cnet.com/rss/news/", label:"Latest" }] },
  { id:"infoworld",    name:"InfoWorld",            region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.infoworld.com/index.rss", label:"Latest" }] },
  { id:"computerworld",name:"Computerworld",        region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.computerworld.com/index.rss", label:"Latest" }] },
  { id:"venturebeat",  name:"VentureBeat",          region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://venturebeat.com/feed/", label:"Latest" }] },
  { id:"cio",          name:"CIO.com",              region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.cio.com/feed/", label:"Latest" }] },
  { id:"cnbctech",     name:"CNBC Technology",      region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://www.cnbc.com/id/19854910/device/rss/rss.html", label:"Technology" }] },
  { id:"reuterstech",  name:"Reuters Technology",   region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://feeds.reuters.com/reuters/technologyNews", label:"Technology" }] },
  { id:"ettech",       name:"ETtech",               region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms", label:"Latest" }] },
  { id:"inc42",        name:"Inc42",                region:"IT Focus", category:"Tech Media",
    feeds:[{ url:"https://inc42.com/feed/", label:"Latest" }] },

  // ── North America ─────────────────────────────────────────────
  { id:"nyt",          name:"The New York Times",   region:"North America", category:"Newspaper",
    feeds:[
      { url:"https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", label:"Top Stories" },
      { url:"https://rss.nytimes.com/services/xml/rss/nyt/World.xml",    label:"World" },
      { url:"https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",label:"Technology" },
    ]},
  { id:"wapo",         name:"The Washington Post",  region:"North America", category:"Newspaper",
    feeds:[
      { url:"https://feeds.washingtonpost.com/rss/world",                label:"World" },
      { url:"https://feeds.washingtonpost.com/rss/business/technology",  label:"Technology" },
    ]},
  { id:"cnn",          name:"CNN",                  region:"North America", category:"Broadcaster",
    feeds:[
      { url:"http://rss.cnn.com/rss/edition.rss",                        label:"Top Stories" },
      { url:"http://rss.cnn.com/rss/edition_world.rss",                  label:"World" },
      { url:"http://rss.cnn.com/rss/edition_technology.rss",             label:"Technology" },
    ]},
  { id:"cnbc",         name:"CNBC",                 region:"North America", category:"Broadcaster",
    feeds:[
      { url:"https://www.cnbc.com/id/100003114/device/rss/rss.html",     label:"Top News" },
      { url:"https://www.cnbc.com/id/10000664/device/rss/rss.html",      label:"World" },
    ]},
  { id:"fox",          name:"Fox News",              region:"North America", category:"Broadcaster",
    feeds:[
      { url:"https://moxie.foxnews.com/google-publisher/world.xml",      label:"World" },
      { url:"https://moxie.foxnews.com/google-publisher/tech.xml",       label:"Tech" },
    ]},

  // ── Europe ────────────────────────────────────────────────────
  { id:"bbc",          name:"BBC News",              region:"Europe", category:"Broadcaster",
    feeds:[
      { url:"https://feeds.bbci.co.uk/news/rss.xml",                     label:"Top Stories" },
      { url:"https://feeds.bbci.co.uk/news/world/rss.xml",               label:"World" },
      { url:"https://feeds.bbci.co.uk/news/technology/rss.xml",          label:"Technology" },
    ]},
  { id:"guardian",     name:"The Guardian",          region:"Europe", category:"Newspaper",
    feeds:[
      { url:"https://www.theguardian.com/world/rss",                     label:"World" },
      { url:"https://www.theguardian.com/technology/rss",                label:"Technology" },
      { url:"https://www.theguardian.com/business/rss",                  label:"Business" },
    ]},
  { id:"euronews",     name:"Euronews",              region:"Europe", category:"Broadcaster",
    feeds:[
      { url:"https://www.euronews.com/rss?format=mrss&level=theme&name=news", label:"News" },
      { url:"https://www.euronews.com/rss?format=mrss&level=theme&name=business", label:"Business" },
    ]},
  { id:"dw",           name:"DW News",               region:"Europe", category:"Broadcaster",
    feeds:[
      { url:"https://rss.dw.com/xml/rss-en-world",                       label:"World" },
      { url:"https://rss.dw.com/xml/rss-en-top",                         label:"Top Stories" },
    ]},

  // ── Asia-Pacific ──────────────────────────────────────────────
  { id:"toi",          name:"The Times of India",    region:"Asia-Pacific", category:"Newspaper",
    feeds:[
      { url:"https://timesofindia.indiatimes.com/rssfeedstopstories.cms",label:"Top Stories" },
      { url:"https://timesofindia.indiatimes.com/rssfeeds/66949542.cms", label:"World" },
      { url:"https://timesofindia.indiatimes.com/rssfeeds/5880659.cms",  label:"Technology" },
    ]},
  { id:"thehindu",     name:"The Hindu",             region:"Asia-Pacific", category:"Newspaper",
    feeds:[
      { url:"https://www.thehindu.com/feeder/default.rss",               label:"Latest" },
      { url:"https://www.thehindu.com/sci-tech/technology/feeder/default.rss", label:"Technology" },
    ]},
  { id:"hindustantimes",name:"Hindustan Times",      region:"Asia-Pacific", category:"Newspaper",
    feeds:[
      { url:"https://www.hindustantimes.com/rss/topnews/rssfeed.xml",    label:"Top News" },
      { url:"https://www.hindustantimes.com/rss/india/rssfeed.xml",      label:"India" },
    ]},
  { id:"japantimes",   name:"The Japan Times",       region:"Asia-Pacific", category:"Newspaper",
    feeds:[
      { url:"https://www.japantimes.co.jp/feed/",                        label:"Latest" },
    ]},
  { id:"ndtv",         name:"NDTV",                  region:"Asia-Pacific", category:"Broadcaster",
    feeds:[
      { url:"https://feeds.feedburner.com/ndtvnews-top-stories",         label:"Top Stories" },
      { url:"https://feeds.feedburner.com/ndtvnews-world-news",          label:"World" },
    ]},

  // ── Middle East & Africa ──────────────────────────────────────
  { id:"aljazeera",    name:"Al Jazeera",            region:"Middle East & Africa", category:"Broadcaster",
    feeds:[
      { url:"https://www.aljazeera.com/xml/rss/all.xml",                 label:"All News" },
    ]},
  { id:"arabnews",     name:"Arab News",             region:"Middle East & Africa", category:"Newspaper",
    feeds:[
      { url:"https://www.arabnews.com/rss.xml",                          label:"Latest" },
    ]},
  { id:"mailguardian", name:"Mail & Guardian",       region:"Middle East & Africa", category:"Newspaper",
    feeds:[
      { url:"https://mg.co.za/feed/",                                    label:"Latest" },
    ]},
];

// Region groupings for sidebar
const REGIONS = [
  { id:"it-focus",     name:"IT Focus",             icon:"💻" },
  { id:"north-america",name:"North America",        icon:"🇺🇸" },
  { id:"europe",       name:"Europe",               icon:"🇬🇧" },
  { id:"asia-pacific", name:"Asia-Pacific",         icon:"🌏" },
  { id:"mea",          name:"Middle East & Africa", icon:"🌍" },
];

// Map source region string → sidebar region id
const REGION_MAP = {
  "IT Focus":             "it-focus",
  "North America":        "north-america",
  "Europe":               "europe",
  "Asia-Pacific":         "asia-pacific",
  "Middle East & Africa": "mea",
};

// Cross-source sections (kept for AI classification)
const CROSS_SECTIONS = [
  {
    id:"tech", name:"IT & Tech", icon:"💻",
    keywords:["technology","software","hardware","cybersecurity","cloud","semiconductor",
      "chip","startup","app","digital","5g","quantum","robotics","ai","microsoft",
      "apple","google","amazon","nvidia","intel"],
  },
  {
    id:"jobcuts", name:"Global Job Cuts", icon:"📉",
    keywords:["layoffs","job cuts","downsizing","redundancies","retrenchment",
      "workforce reduction","employees laid off","restructuring","headcount",
      "hiring freeze","job losses","unemployment"],
  },
  {
    id:"ai", name:"LLM & AI", icon:"🤖",
    keywords:["openai","anthropic","claude","chatgpt","gpt","gemini","llama",
      "mistral","artificial intelligence","large language model","llm",
      "generative ai","foundation model","ai safety","machine learning",
      "neural network","ai agent","multimodal"],
  },
];

module.exports = { SOURCES, REGIONS, REGION_MAP, CROSS_SECTIONS };
