/* ══════════════════════════════════════════════════════════════
   Global Briefing — app.js
   Sidebar source nav · newspaper card layout · AI classified
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const NEWS_JSON  = "./news.json";
  const REFRESH_MS = 15 * 60 * 1000;

  const ICONS = { Newspaper:"📰", Broadcaster:"📡", "Tech Media":"💻", Magazine:"📖", default:"🌐" };
  const SOURCE_COLORS = {
    techcrunch:["#1a0a00","#3d1500"],    theverge:["#1a001a","#2d0033"],
    wired:["#111","#222"],               arstechnica:["#001a33","#003366"],
    zdnet:["#000d1a","#001433"],         cnet:["#000d1a","#00112b"],
    infoworld:["#001a0d","#003319"],     computerworld:["#001a33","#002b52"],
    venturebeat:["#1a000d","#330019"],   cio:["#001a33","#002b52"],
    cnbctech:["#001933","#002b4d"],      reuterstech:["#1a0000","#2d0000"],
    ettech:["#001a33","#002952"],        inc42:["#1a0a00","#331400"],
    nyt:["#111","#1f1f1f"],             wapo:["#0a1628","#1a2d50"],
    cnn:["#aa0000","#7a0000"],          cnbc:["#001933","#002b4d"],
    fox:["#001a33","#001030"],          bbc:["#8b0000","#5a0000"],
    guardian:["#052962","#0d3d7a"],     euronews:["#00194d","#002b7a"],
    dw:["#00477a","#002f52"],           toi:["#b32800","#7a1a00"],
    thehindu:["#00194d","#002b7a"],     hindustantimes:["#8b0000","#5a0000"],
    japantimes:["#001a33","#002b52"],   ndtv:["#aa0000","#7a0000"],
    aljazeera:["#155d32","#0a3d20"],    arabnews:["#8b0000","#5a0000"],
    mailguardian:["#001a33","#002b52"],
  };

  const PAYWALL = [
    "subscribe","subscription","sign in to read","login to read",
    "members only","premium content","unlock this article","register to read",
  ];
  function isValid(a) {
    if (!a.title || a.title.trim().length < 8) return false;
    if (!a.article_url || !a.article_url.startsWith("http")) return false;
    const t = `${a.title} ${a.summary||""}`.toLowerCase();
    return !PAYWALL.some(p => t.includes(p));
  }

  // ── State ─────────────────────────────────────────────────
  let state = {
    data: null,
    selectedSourceId: null, // null = all sources
    refreshTimer: null,
    countdownInterval: null,
    nextRefreshAt: null,
    lastEtag: null,
  };

  const $ = id => document.getElementById(id);
  const el = {
    loading: $("loadingScreen"), error: $("errorScreen"), errorMsg: $("errorMessage"),
    feed: $("articleFeed"), panelHeading: $("panelHeading"),
    phName: $("phSourceName"), phMeta: $("phMeta"),
    dot: $("statusDot"), statusTxt: $("statusText"), countdown: $("countdownTimer"),
    btnRefresh: $("btnRefresh"), btnTheme: $("btnTheme"),
    btt: $("backToTop"), toast: $("toast"),
    statsMeta: $("statsMeta"), dateEl: $("currentDate"),
    sbAllBtn: $("sbAllBtn"), sbRegions: $("sbRegions"),
    sbSearch: $("sbSearch"), sidebar: $("sidebar"),
    mobToggle: $("mobSidebarToggle"),
  };

  // ── Theme ──────────────────────────────────────────────────
  function initTheme() {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("gb-theme") || "dark");
  }
  function toggleTheme() {
    const n = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", n);
    localStorage.setItem("gb-theme", n);
  }

  // ── Utils ──────────────────────────────────────────────────
  function timeAgo(d) {
    if (!d) return "—";
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  }
  function esc(s) {
    if (!s) return "";
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function showToast(msg, ms=3000) {
    el.toast.textContent = msg; el.toast.classList.remove("hidden");
    clearTimeout(el.toast._t); el.toast._t = setTimeout(() => el.toast.classList.add("hidden"), ms);
  }
  function setStatus(type, text) {
    el.dot.className = `ldot ${type}`; el.statusTxt.textContent = text;
  }
  function setDate() {
    if (el.dateEl) el.dateEl.textContent = new Date().toLocaleDateString("en-US", {
      weekday:"long", year:"numeric", month:"long", day:"numeric"
    });
  }

  // ── Countdown ──────────────────────────────────────────────
  function startCountdown() {
    clearInterval(state.countdownInterval);
    state.nextRefreshAt = Date.now() + REFRESH_MS;
    state.countdownInterval = setInterval(() => {
      const left = Math.max(0, state.nextRefreshAt - Date.now());
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      el.countdown.textContent = `↻ ${m}:${String(s).padStart(2,"0")}`;
    }, 1000);
  }

  // ── Fetch ──────────────────────────────────────────────────
  async function fetchNews(force = false) {
    setStatus("loading", "Loading…"); el.btnRefresh.classList.add("spinning");
    try {
      const url = force ? `${NEWS_JSON}?t=${Date.now()}` : NEWS_JSON;
      const headers = {};
      if (state.lastEtag && !force) headers["If-None-Match"] = state.lastEtag;
      const res = await fetch(url, { headers, cache: force ? "no-store" : "default" });
      if (res.status === 304) { setStatus("ok","Live"); if(force) showToast("✓ Already up to date"); scheduleNext(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const etag = res.headers.get("ETag"); if (etag) state.lastEtag = etag;
      const data = await res.json();
      state.data = data;
      buildSidebar(data);
      renderPanel();
      setStatus("ok", "Live");
      if (force) showToast(`✓ Refreshed — ${data.new_this_run||0} new articles`);
    } catch(err) {
      console.error(err); setStatus("error", "Error");
      if (!state.data) {
        el.loading.classList.add("hidden"); el.error.classList.remove("hidden");
        el.errorMsg.textContent = "Could not load news.json — trigger a GitHub Actions run first.";
      } else showToast("⚠ Refresh failed — showing last data");
    } finally {
      el.btnRefresh.classList.remove("spinning"); scheduleNext();
    }
  }
  function scheduleNext() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => fetchNews(false), REFRESH_MS);
    startCountdown();
  }
  function forceRefresh() { clearTimeout(state.refreshTimer); fetchNews(true); }

  // ── Sidebar ────────────────────────────────────────────────
  function buildSidebar(data) {
    const total = (data.sources||[]).reduce((s,src) => s + (src.articles||[]).length, 0);
    if (el.statsMeta) el.statsMeta.textContent =
      `Last updated: ${timeAgo(data.last_updated)} · ${total} articles · ${data.meta?.ai_enabled?"AI classified":"keyword classified"}`;

    // Use regions array from news.json if available, else build from sources
    const regionGroups = data.regions || buildRegionsFromSources(data.sources||[]);

    el.sbRegions.innerHTML = regionGroups.map(region => `
      <div class="sb-region" data-region-id="${esc(region.id)}">
        <div class="sb-region-header" onclick="window.app.toggleRegion('${esc(region.id)}')">
          <span class="sb-region-name">${region.icon||""} ${esc(region.name)}</span>
          <span class="sb-chevron">▾</span>
        </div>
        <div class="sb-sources">
          ${(region.sources||[]).map(src => `
            <button class="sb-source-btn"
                    data-source-id="${esc(src.id)}"
                    onclick="window.app.selectSource('${esc(src.id)}')">
              <span>${esc(src.name)}</span>
              <span class="sb-source-count">${src.count||0}</span>
            </button>`).join("")}
        </div>
      </div>`).join("");

    updateSidebarActive();
  }

  function buildRegionsFromSources(sources) {
    const REGION_META = {
      "IT Focus":             { id:"it-focus",     icon:"💻", order:0 },
      "North America":        { id:"north-america", icon:"🇺🇸", order:1 },
      "Europe":               { id:"europe",        icon:"🇬🇧", order:2 },
      "Asia-Pacific":         { id:"asia-pacific",  icon:"🌏", order:3 },
      "Middle East & Africa": { id:"mea",           icon:"🌍", order:4 },
    };
    const map = {};
    sources.forEach(src => {
      const meta = REGION_META[src.region];
      if (!meta) return;
      if (!map[meta.id]) map[meta.id] = { ...meta, name:src.region, sources:[] };
      map[meta.id].sources.push({ id:src.id, name:src.name, count:(src.articles||[]).length });
    });
    return Object.values(map).sort((a,b) => a.order-b.order);
  }

  function updateSidebarActive() {
    document.querySelectorAll(".sb-source-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.sourceId === state.selectedSourceId);
    });
    el.sbAllBtn.classList.toggle("active", !state.selectedSourceId);
  }

  function toggleRegion(regionId) {
    const region = document.querySelector(`[data-region-id="${regionId}"]`);
    if (region) region.classList.toggle("collapsed");
  }

  // ── Source selection ───────────────────────────────────────
  function selectSource(sourceId) {
    state.selectedSourceId = sourceId;
    updateSidebarActive();
    renderPanel();
    // On mobile close sidebar
    if (window.innerWidth <= 768) el.sidebar.classList.remove("mob-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAll() {
    state.selectedSourceId = null;
    updateSidebarActive();
    renderPanel();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Render main panel ──────────────────────────────────────
  function renderPanel() {
    if (!state.data) return;
    el.loading.classList.add("hidden");
    el.error.classList.add("hidden");
    el.feed.classList.remove("hidden");

    if (state.selectedSourceId) {
      renderSingleSource(state.selectedSourceId);
    } else {
      renderAllSources();
    }
  }

  function renderSingleSource(sourceId) {
    const source = (state.data.sources||[]).find(s => s.id === sourceId);
    if (!source) { renderAllSources(); return; }

    const articles = (source.articles||[]).filter(isValid);
    const icon = ICONS[source.category] || ICONS.default;

    // Show heading
    el.panelHeading.classList.remove("hidden");
    el.phName.textContent = source.name;
    el.phMeta.textContent = `${icon} ${source.category} · ${source.region} · ${articles.length} articles`;

    el.feed.innerHTML = articles.length
      ? `<div class="card-grid">${articles.map(a => card(a, false)).join("")}</div>`
      : `<div style="padding:40px;text-align:center;color:var(--ink-3)">No articles available right now.</div>`;
  }

  function renderAllSources() {
    el.panelHeading.classList.add("hidden");

    const sources = (state.data.sources||[])
      .map(src => ({ ...src, articles:(src.articles||[]).filter(isValid) }))
      .filter(src => src.articles.length > 0);

    el.feed.innerHTML = sources.map(src => {
      const icon = ICONS[src.category] || ICONS.default;
      return `
        <div class="source-block" data-source-id="${esc(src.id)}">
          <div class="source-block-header">
            <h2 class="source-block-name">${esc(src.name)}</h2>
            <div class="source-block-meta">
              <span class="sbb-region">${esc(src.region)}</span>
              <span class="sbb-cat">${icon} ${esc(src.category)}</span>
              <span class="sbb-count">${src.articles.length} articles</span>
            </div>
          </div>
          <div class="card-grid">${src.articles.map(a => card(a, false)).join("")}</div>
        </div>`;
    }).join("");
  }

  // ── Card ───────────────────────────────────────────────────
  function card(article, showSource) {
    if (!isValid(article)) return "";

    const tagMap = { tech:"tech", ai:"ai", jobcuts:"jobcuts" };
    const icon = ICONS[article.source_category] || ICONS.default;
    const clr = SOURCE_COLORS[article.source_id] || ["#1a1e2e","#0d0f12"];
    const grad = `linear-gradient(135deg,${clr[0]},${clr[1]})`;
    const tags = (article.cross_sections||[])
      .map(sid => `<span class="ctag ${tagMap[sid]||""}">${sid}</span>`).join("");

    const hasImg = !!article.image_url;
    const imgBlock = hasImg
      ? `<img class="card-img" src="${esc(article.image_url)}" alt="" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
         <div class="card-img-fb" style="display:none;--fallback:${grad}">
           <div style="text-align:center">
             <span class="fb-icon">${icon}</span>
             <span class="fb-label">${esc(article.source_name)}</span>
           </div>
         </div>`
      : "";

    const feedLine = article.feed_label
      ? `<span class="card-feed">${esc(article.feed_label)}</span>`
      : "";

    return `
      <article class="news-card${hasImg ? "" : " no-img"}">
        <a href="${esc(article.article_url)}" target="_blank" rel="noopener noreferrer">
          ${imgBlock}
          <div style="display:flex;flex-direction:column;flex:1">
            ${feedLine}
            <h3 class="card-title">${esc(article.title)}</h3>
            ${article.summary ? `<p class="card-summary">${esc(article.summary)}</p>` : ""}
            <div class="card-foot">
              <span class="card-time">${timeAgo(article.published_at)}</span>
              <div class="card-tags">${tags}</div>
              <span class="card-read">Read →</span>
            </div>
          </div>
        </a>
      </article>`;
  }

  // ── Sidebar search ─────────────────────────────────────────
  function handleSearch(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll(".sb-source-btn").forEach(btn => {
      const name = btn.querySelector("span")?.textContent?.toLowerCase() || "";
      btn.classList.toggle("sb-hidden", q !== "" && !name.includes(q));
    });
    // Show/hide region groups based on visible sources
    document.querySelectorAll(".sb-region").forEach(region => {
      const anyVisible = [...region.querySelectorAll(".sb-source-btn")]
        .some(b => !b.classList.contains("sb-hidden"));
      region.style.display = (q === "" || anyVisible) ? "" : "none";
    });
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents() {
    el.btnTheme.addEventListener("click", toggleTheme);
    el.btnRefresh.addEventListener("click", forceRefresh);
    el.sbSearch.addEventListener("input", e => handleSearch(e.target.value));

    // Mobile sidebar toggle
    el.mobToggle.addEventListener("click", () => {
      el.sidebar.classList.toggle("mob-open");
    });

    window.addEventListener("scroll", () =>
      el.btt.classList.toggle("hidden", window.scrollY < 500), { passive: true });
    el.btt.addEventListener("click", () => window.scrollTo({ top:0, behavior:"smooth" }));
  }

  // ── Public API ─────────────────────────────────────────────
  window.app = { forceRefresh, selectSource, selectAll, toggleRegion };

  // ── Init ───────────────────────────────────────────────────
  function init() { initTheme(); setDate(); bindEvents(); fetchNews(false); }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init) : init();
})();
