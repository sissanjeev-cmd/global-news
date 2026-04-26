/* ═══════════════════════════════════════════════════════════════
   Global News — app.js  (GitHub Pages edition)
   Reads from static news.json — no backend required
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const NEWS_JSON      = "./news.json";
  const REFRESH_MS     = 15 * 60 * 1000;
  const FALLBACK_ICONS = { Newspaper: "📰", Broadcaster: "📡", Magazine: "📖", default: "🌐" };
  const REGION_FLAGS   = {
    US: "🇺🇸", UK: "🇬🇧", India: "🇮🇳", Europe: "🇪🇺",
    Asia: "🌏", Australia: "🇦🇺", "Middle East": "🌍", default: "🌐",
  };
  // Per-source gradient colors for image fallbacks
  const SOURCE_COLORS = {
    nyt:          ["#1a1a1a", "#333"],
    wapo:         ["#0a1628", "#1a2d50"],
    wsj:          ["#0d1b2a", "#1a3a5c"],
    guardian:     ["#052962", "#0d3d7a"],
    bbc:          ["#b80000", "#7a0000"],
    cnn:          ["#cc0000", "#8a0000"],
    fox:          ["#003366", "#001f40"],
    aljazeera:    ["#1a6b3a", "#0d4025"],
    france24:     ["#d4001a", "#8a0012"],
    dw:           ["#005a96", "#003d6b"],
    spiegel:      ["#cc0000", "#8a0000"],
    time:         ["#cc0000", "#8a0000"],
    economist:    ["#cc0000", "#8a0000"],
    newsweek:     ["#003399", "#001f66"],
    newyorker:    ["#1a1a1a", "#333"],
    ndtv:         ["#cc0000", "#8a0000"],
    aajtak:       ["#cc0000", "#8a0000"],
    indiatoday:   ["#cc0000", "#8a0000"],
    frontline:    ["#003366", "#001f40"],
    toi:          ["#cc3300", "#8a2200"],
    dainikbhaskar:["#cc3300", "#8a2200"],
    chinadaily:   ["#cc0000", "#8a0000"],
    smh:          ["#003399", "#001f66"],
  };

  let state = {
    data: null, activeTab: "all",
    refreshTimer: null, countdownInterval: null, nextRefreshAt: null,
    collapsedSections: new Set(), lastEtag: null,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    loading: $("loadingScreen"), error: $("errorScreen"), errorMsg: $("errorMessage"),
    statsBar: $("statsBar"), statArticles: $("statArticles"), statSources: $("statSources"),
    statUpdated: $("statUpdated"), cacheBadge: $("cachebadge"),
    crossSections: $("crossSections"), sourceSections: $("sourceSections"),
    statusDot: $("statusDot"), statusText: $("statusText"), countdown: $("countdownTimer"),
    btnRefresh: $("btnRefresh"), btnTheme: $("btnTheme"), sectionNav: $("sectionNav"),
    backToTop: $("backToTop"), toast: $("toast"), loadingSources: $("loadingSources"),
  };

  // ── Theme ─────────────────────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem("gn-theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }
  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("gn-theme", next);
  }

  // ── Utils ─────────────────────────────────────────────────────
  function timeAgo(dateStr) {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  function escHtml(str) {
    if (!str) return "";
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function showToast(msg, duration = 3000) {
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(() => el.toast.classList.add("hidden"), duration);
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
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      el.countdown.textContent = `${m}:${String(s).padStart(2, "0")}`;
    }, 1000);
  }

  // ── Fetch ─────────────────────────────────────────────────────
  async function fetchNews(force = false) {
    setStatus("loading", "Fetching…");
    el.btnRefresh.classList.add("spinning");
    try {
      const url = force ? `${NEWS_JSON}?t=${Date.now()}` : NEWS_JSON;
      const headers = {};
      if (state.lastEtag && !force) headers["If-None-Match"] = state.lastEtag;

      const res = await fetch(url, { headers, cache: force ? "no-store" : "default" });

      if (res.status === 304) {
        setStatus("ok", "Live");
        if (force) showToast("✓ Already up to date");
        scheduleNext(); return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const etag = res.headers.get("ETag");
      if (etag) state.lastEtag = etag;

      const data = await res.json();
      state.data = data;
      renderAll(data);
      setStatus("ok", "Live");
      if (force) showToast(`✓ Refreshed — ${data.new_this_run || 0} new articles`);
    } catch (err) {
      console.error("[App]", err);
      setStatus("error", "Error");
      if (!state.data) {
        el.loading.classList.add("hidden");
        el.error.classList.remove("hidden");
        el.errorMsg.textContent = "news.json not found. Run `npm run build` first, then push to GitHub.";
      } else {
        showToast("⚠ Could not refresh — showing last data");
      }
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

  function forceRefresh() {
    clearTimeout(state.refreshTimer);
    fetchNews(true);
  }

  // ── Render ────────────────────────────────────────────────────
  function renderAll(data) {
    el.loading.classList.add("hidden");
    el.error.classList.add("hidden");
    [el.statsBar, el.crossSections, el.sourceSections].forEach((e) => e.classList.remove("hidden"));

    const total = data.sources?.reduce((s, src) => s + src.articles.length, 0) || 0;
    el.statArticles.textContent = `${total} articles`;
    el.statSources.textContent  = `${data.sources?.length || 0} sources`;
    el.statUpdated.textContent  = `Updated ${timeAgo(data.last_updated)}`;
    el.cacheBadge.textContent   = data.meta?.ai_enabled ? "AI classified" : "keyword classified";

    renderCrossSections(data.cross_sections || []);
    renderSourceSections(data.sources || []);
    applyTabFilter(state.activeTab);
  }

  function renderCrossSections(sections) {
    el.crossSections.innerHTML = sections.map((s) => `
      <div class="cross-section-block" data-id="${s.id}" data-cross="${s.id}">
        <div class="cross-section-header">
          <h2 class="cross-section-title">${s.icon} ${escHtml(s.name)}</h2>
          <span class="cross-section-count">${s.articles.length} articles</span>
        </div>
        ${s.articles.length
          ? `<div class="cross-section-grid">${s.articles.map((a) => renderCard(a, true)).join("")}</div>`
          : `<div class="empty-section">No articles yet — classification runs every 15 min via GitHub Actions.</div>`}
      </div>`).join("");
  }

  function renderSourceSections(sources) {
    el.sourceSections.innerHTML = sources.map((source) => {
      const flag = REGION_FLAGS[source.region] || REGION_FLAGS.default;
      const icon = FALLBACK_ICONS[source.category] || FALLBACK_ICONS.default;
      const collapsed = state.collapsedSections.has(source.id) ? "collapsed" : "";
      return `
        <section class="source-section ${collapsed}"
                 data-source-id="${source.id}" data-region="${source.region}">
          <div class="source-section-header" role="button" tabindex="0"
               onclick="window.newsApp.toggleSection('${source.id}')"
               onkeypress="if(event.key==='Enter')window.newsApp.toggleSection('${source.id}')">
            <div class="source-meta">
              <h2 class="source-name">${flag} ${escHtml(source.name)}</h2>
              <span class="source-region-badge">${source.region}</span>
              <span class="source-category-badge">${icon} ${source.category}</span>
            </div>
            <span class="source-section-count">${source.articles.length} articles</span>
            <span class="source-toggle">▾</span>
          </div>
          <div class="source-articles">
            <div class="card-grid">${source.articles.map((a) => renderCard(a, false)).join("")}</div>
          </div>
        </section>`;
    }).join("");
  }

  function renderCard(article, showSourceTag) {
    const tagMap = { tech: "tech", ai: "ai", jobcuts: "jobcuts" };
    const icon   = FALLBACK_ICONS[article.source_category] || FALLBACK_ICONS.default;
    const tags   = (article.cross_sections || [])
      .map((sid) => `<span class="card-tag ${tagMap[sid]||""}">${sid}</span>`).join("");

    // Source-specific gradient for fallback
    const colors  = SOURCE_COLORS[article.source_id] || ["#1a1e2e", "#0d0f12"];
    const gradient = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;

    const imgHtml = article.image_url
      ? `<img class="card-image" src="${escHtml(article.image_url)}" alt="" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
         <div class="card-image-fallback" style="display:none;--fallback-gradient:${gradient}">
           <div class="card-image-fallback-inner">
             <span class="card-image-fallback-icon">${icon}</span>
             <span class="card-image-fallback-label">${escHtml(article.source_name)}</span>
           </div></div>`
      : `<div class="card-image-fallback" style="--fallback-gradient:${gradient}">
           <div class="card-image-fallback-inner">
             <span class="card-image-fallback-icon">${icon}</span>
             <span class="card-image-fallback-label">${escHtml(article.source_name)}</span>
           </div></div>`;

    const srcTag = showSourceTag
      ? `<span class="card-source-tag">${escHtml(article.source_name)} · ${escHtml(article.feed_label||"")}</span>`
      : `<span class="card-source-tag">${escHtml(article.feed_label||"")}</span>`;

    return `
      <article class="news-card">
        <a href="${escHtml(article.article_url)}" target="_blank" rel="noopener noreferrer">
          ${imgHtml}
          <div class="card-body">
            ${srcTag}
            <h3 class="card-title">${escHtml(article.title)}</h3>
            ${article.summary ? `<p class="card-summary">${escHtml(article.summary)}</p>` : ""}
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
  function applyTabFilter(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".nav-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.section === tabId));

    const crossBlocks = el.crossSections.querySelectorAll(".cross-section-block");
    const sourceSects = el.sourceSections.querySelectorAll(".source-section");

    if (tabId === "all") {
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach((b) => b.classList.remove("hidden"));
      sourceSects.forEach((s) => s.classList.remove("hidden"));
    } else if (tabId.startsWith("cross-")) {
      const crossId = tabId.replace("cross-", "");
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach((b) => b.classList.toggle("hidden", b.dataset.id !== crossId));
      sourceSects.forEach((s) => s.classList.add("hidden"));
    } else if (tabId.startsWith("region-")) {
      const region = tabId.replace("region-", "");
      el.crossSections.classList.add("hidden");
      sourceSects.forEach((s) => s.classList.toggle("hidden", s.dataset.region !== region));
    }
  }

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
    el.sectionNav.addEventListener("click", (e) => {
      const tab = e.target.closest(".nav-tab");
      if (tab?.dataset.section) applyTabFilter(tab.dataset.section);
    });
    window.addEventListener("scroll", () =>
      el.backToTop.classList.toggle("hidden", window.scrollY < 400), { passive: true });
    el.backToTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  window.newsApp = { forceRefresh, toggleSection };

  function init() { initTheme(); bindEvents(); fetchNews(false); }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
