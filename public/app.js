/* ═══════════════════════════════════════════════════════════════
   Global News — app.js  v3
   Fixes: text-only cards · correct tab filtering · source grouping
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const NEWS_JSON  = "./news.json";
  const REFRESH_MS = 15 * 60 * 1000;

  const FALLBACK_ICONS = { Newspaper:"📰", Broadcaster:"📡", Magazine:"📖", default:"🌐" };
  const REGION_FLAGS   = {
    US:"🇺🇸", UK:"🇬🇧", India:"🇮🇳", Europe:"🇪🇺",
    Asia:"🌏", Australia:"🇦🇺", "Middle East":"🌍", default:"🌐",
  };
  const SOURCE_COLORS = {
    nyt:["#1a1a1a","#2d2d2d"],          wapo:["#0a1628","#1a2d50"],
    wsj:["#0d1b2a","#1a3a5c"],          guardian:["#052962","#0d3d7a"],
    bbc:["#8b0000","#5a0000"],          cnn:["#aa0000","#7a0000"],
    fox:["#002244","#001530"],          aljazeera:["#155d32","#0a3d20"],
    france24:["#b8001a","#800012"],     dw:["#00477a","#002f52"],
    spiegel:["#aa0000","#7a0000"],      time:["#aa0000","#7a0000"],
    economist:["#aa0000","#7a0000"],    newsweek:["#002b80","#001a52"],
    newyorker:["#1a1a1a","#2d2d2d"],   ndtv:["#aa0000","#7a0000"],
    aajtak:["#aa0000","#7a0000"],       indiatoday:["#aa0000","#7a0000"],
    frontline:["#002b80","#001a52"],    toi:["#b32800","#7a1a00"],
    dainikbhaskar:["#b32800","#7a1a00"],chinadaily:["#aa0000","#7a0000"],
    smh:["#002b80","#001a52"],
  };

  // ── State ─────────────────────────────────────────────────────
  let state = {
    data: null, activeTab: "all",
    refreshTimer: null, countdownInterval: null, nextRefreshAt: null,
    collapsedSections: new Set(), lastEtag: null,
  };

  // ── DOM ───────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = {
    loading:$("loadingScreen"), error:$("errorScreen"), errorMsg:$("errorMessage"),
    statsBar:$("statsBar"), statArticles:$("statArticles"), statSources:$("statSources"),
    statUpdated:$("statUpdated"), cacheBadge:$("cachebadge"),
    crossSections:$("crossSections"), sourceSections:$("sourceSections"),
    statusDot:$("statusDot"), statusText:$("statusText"), countdown:$("countdownTimer"),
    btnRefresh:$("btnRefresh"), btnTheme:$("btnTheme"), sectionNav:$("sectionNav"),
    backToTop:$("backToTop"), toast:$("toast"), loadingSources:$("loadingSources"),
  };

  // ── Theme ─────────────────────────────────────────────────────
  function initTheme() {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("gn-theme") || "dark");
  }
  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("gn-theme", next);
  }

  // ── Utils ─────────────────────────────────────────────────────
  function timeAgo(d) {
    if (!d) return "—";
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  function esc(s) {
    if (!s) return "";
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function toast(msg, ms=3000) {
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(el.toast._t);
    el.toast._t = setTimeout(() => el.toast.classList.add("hidden"), ms);
  }
  function setStatus(type, text) {
    el.statusDot.className = `status-dot ${type}`;
    el.statusText.textContent = text;
  }

  // ── Countdown ─────────────────────────────────────────────────
  function startCountdown() {
    clearInterval(state.countdownInterval);
    state.nextRefreshAt = Date.now() + REFRESH_MS;
    state.countdownInterval = setInterval(() => {
      const left = Math.max(0, state.nextRefreshAt - Date.now());
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      el.countdown.textContent = `${m}:${String(s).padStart(2,"0")}`;
    }, 1000);
  }

  // ── Fetch ─────────────────────────────────────────────────────
  async function fetchNews(force=false) {
    setStatus("loading", "Fetching…");
    el.btnRefresh.classList.add("spinning");
    try {
      const url = force ? `${NEWS_JSON}?t=${Date.now()}` : NEWS_JSON;
      const headers = {};
      if (state.lastEtag && !force) headers["If-None-Match"] = state.lastEtag;
      const res = await fetch(url, { headers, cache: force ? "no-store" : "default" });
      if (res.status === 304) { setStatus("ok","Live"); if(force) toast("✓ Already up to date"); scheduleNext(); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const etag = res.headers.get("ETag");
      if (etag) state.lastEtag = etag;
      const data = await res.json();
      state.data = data;
      renderAll(data);
      setStatus("ok","Live");
      if (force) toast(`✓ Refreshed — ${data.new_this_run||0} new articles`);
    } catch(err) {
      console.error(err);
      setStatus("error","Error");
      if (!state.data) {
        el.loading.classList.add("hidden");
        el.error.classList.remove("hidden");
        el.errorMsg.textContent = "news.json not found. Trigger a GitHub Actions run first.";
      } else toast("⚠ Refresh failed — showing last data");
    } finally {
      el.btnRefresh.classList.remove("spinning");
      scheduleNext();
    }
  }
  function scheduleNext() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(() => fetchNews(false), REFRESH_MS);
    startCountdown();
  }
  function forceRefresh() { clearTimeout(state.refreshTimer); fetchNews(true); }

  // ── Render all ────────────────────────────────────────────────
  function renderAll(data) {
    el.loading.classList.add("hidden");
    el.error.classList.add("hidden");
    [el.statsBar, el.crossSections, el.sourceSections].forEach(e => e.classList.remove("hidden"));

    const total = data.sources?.reduce((s,src) => s + src.articles.length, 0) || 0;
    el.statArticles.textContent = `${total} articles`;
    el.statSources.textContent  = `${data.sources?.length||0} sources`;
    el.statUpdated.textContent  = `Updated ${timeAgo(data.last_updated)}`;
    el.cacheBadge.textContent   = data.meta?.ai_enabled ? "AI classified" : "keyword classified";

    renderCrossSections(data.cross_sections || []);
    renderSourceSections(data.sources || []);
    applyTabFilter(state.activeTab);
  }

  // ── Cross sections ────────────────────────────────────────────
  function renderCrossSections(sections) {
    el.crossSections.innerHTML = sections.map(s => `
      <div class="cross-section-block" data-id="${s.id}" data-cross="${s.id}">
        <div class="cross-section-header">
          <h2 class="cross-section-title">${s.icon} ${esc(s.name)}</h2>
          <span class="cross-section-count">${s.articles.length} articles</span>
        </div>
        ${s.articles.length
          ? `<div class="cross-section-grid">${s.articles.map(a => renderCard(a, true)).join("")}</div>`
          : `<div class="empty-section">No articles yet — classification runs every 15 min.</div>`}
      </div>`).join("");
  }

  // ── Source sections ───────────────────────────────────────────
  // Each source appears exactly ONCE with ALL its articles in one grid
  function renderSourceSections(sources) {
    el.sourceSections.innerHTML = sources.map(source => {
      const flag = REGION_FLAGS[source.region] || REGION_FLAGS.default;
      const icon = FALLBACK_ICONS[source.category] || FALLBACK_ICONS.default;
      const collapsed = state.collapsedSections.has(source.id) ? "collapsed" : "";
      return `
        <section class="source-section ${collapsed}"
                 data-source-id="${source.id}"
                 data-region="${source.region}">
          <div class="source-section-header" role="button" tabindex="0"
               onclick="window.newsApp.toggleSection('${source.id}')"
               onkeypress="if(event.key==='Enter')window.newsApp.toggleSection('${source.id}')">
            <div class="source-meta">
              <h2 class="source-name">${flag} ${esc(source.name)}</h2>
              <span class="source-region-badge">${esc(source.region)}</span>
              <span class="source-category-badge">${icon} ${esc(source.category)}</span>
            </div>
            <span class="source-section-count">${source.articles.length} articles</span>
            <span class="source-toggle">▾</span>
          </div>
          <div class="source-articles">
            <div class="card-grid">
              ${source.articles.map(a => renderCard(a, false)).join("")}
            </div>
          </div>
        </section>`;
    }).join("");
  }

  // ── Card ──────────────────────────────────────────────────────
  function renderCard(article, showSource) {
    const tagMap = { tech:"tech", ai:"ai", jobcuts:"jobcuts" };
    const icon   = FALLBACK_ICONS[article.source_category] || FALLBACK_ICONS.default;
    const colors = SOURCE_COLORS[article.source_id] || ["#1a1e2e","#0d0f12"];
    const grad   = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
    const tags   = (article.cross_sections||[])
      .map(sid => `<span class="card-tag ${tagMap[sid]||""}">${sid}</span>`).join("");

    const hasImage = !!article.image_url;

    // Image block — only rendered if source provides one; on error shows fallback
    const imageBlock = hasImage
      ? `<img class="card-image" src="${esc(article.image_url)}" alt="" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
         <div class="card-image-fallback" style="display:none;--fallback-gradient:${grad}">
           <div class="card-image-fallback-inner">
             <span class="card-image-fallback-icon">${icon}</span>
             <span class="card-image-fallback-label">${esc(article.source_name)}</span>
           </div>
         </div>`
      : ""; // No image = no placeholder — text-only card

    const srcTag = showSource
      ? `<span class="card-source-tag">${esc(article.source_name)} · ${esc(article.feed_label||"")}</span>`
      : `<span class="card-source-tag">${esc(article.feed_label||"")}</span>`;

    return `
      <article class="news-card${hasImage ? "" : " no-image"}">
        <a href="${esc(article.article_url)}" target="_blank" rel="noopener noreferrer">
          ${imageBlock}
          <div class="card-body">
            ${srcTag}
            <h3 class="card-title">${esc(article.title)}</h3>
            ${article.summary ? `<p class="card-summary">${esc(article.summary)}</p>` : ""}
            <div class="card-footer">
              <span class="card-time">${timeAgo(article.published_at)}</span>
              <div class="card-section-tags">${tags}</div>
              <span class="card-read-more">Read →</span>
            </div>
          </div>
        </a>
      </article>`;
  }

  // ── Tab filtering ─────────────────────────────────────────────
  // "All Sources" shows cross-sections + all source sections
  // "IT & Tech" shows ONLY the tech cross-section block
  // "Region-X"  shows ONLY source sections for that region
  function applyTabFilter(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".nav-tab").forEach(t =>
      t.classList.toggle("active", t.dataset.section === tabId));

    const crossBlocks = el.crossSections.querySelectorAll(".cross-section-block");
    const sourceSects = el.sourceSections.querySelectorAll(".source-section");

    if (tabId === "all") {
      // Show everything
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach(b => b.classList.remove("hidden"));
      sourceSects.forEach(s => s.classList.remove("hidden"));

    } else if (tabId.startsWith("cross-")) {
      // Show only that cross-section block; hide source sections
      const crossId = tabId.replace("cross-", "");
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach(b => b.classList.toggle("hidden", b.dataset.id !== crossId));
      el.sourceSections.classList.add("hidden");

    } else if (tabId.startsWith("region-")) {
      // Show only source sections for that region; hide cross sections
      const region = tabId.replace("region-", "");
      el.crossSections.classList.add("hidden");
      el.sourceSections.classList.remove("hidden");
      sourceSects.forEach(s => s.classList.toggle("hidden", s.dataset.region !== region));
    }
  }

  // ── Section collapse ──────────────────────────────────────────
  function toggleSection(sourceId) {
    const section = document.querySelector(`[data-source-id="${sourceId}"]`);
    if (!section) return;
    section.classList.toggle("collapsed")
      ? state.collapsedSections.add(sourceId)
      : state.collapsedSections.delete(sourceId);
  }

  // ── Events ────────────────────────────────────────────────────
  function bindEvents() {
    el.btnTheme.addEventListener("click", toggleTheme);
    el.btnRefresh.addEventListener("click", forceRefresh);
    el.sectionNav.addEventListener("click", e => {
      const tab = e.target.closest(".nav-tab");
      if (tab?.dataset.section) applyTabFilter(tab.dataset.section);
    });
    window.addEventListener("scroll", () =>
      el.backToTop.classList.toggle("hidden", window.scrollY < 400), { passive:true });
    el.backToTop.addEventListener("click", () =>
      window.scrollTo({ top:0, behavior:"smooth" }));
  }

  window.newsApp = { forceRefresh, toggleSection };

  function init() { initTheme(); bindEvents(); fetchNews(false); }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
