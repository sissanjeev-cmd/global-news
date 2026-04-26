/* ═══════════════════════════════════════════════════════════════
   Global News — app.js
   Frontend: fetch · render · filter · auto-refresh · dark mode
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────
  const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  const API_BASE = "";                          // same-origin
  const FALLBACK_ICONS = {
    Newspaper: "📰",
    Broadcaster: "📡",
    Magazine: "📖",
    default: "🌐",
  };
  const REGION_FLAGS = {
    US: "🇺🇸",
    UK: "🇬🇧",
    India: "🇮🇳",
    Europe: "🇪🇺",
    Asia: "🌏",
    Australia: "🇦🇺",
    "Middle East": "🌍",
    default: "🌐",
  };

  // ── State ────────────────────────────────────────────────────
  let state = {
    data: null,
    activeTab: "all",
    refreshTimer: null,
    countdownInterval: null,
    nextRefreshAt: null,
    lastSeenIds: new Set(),
    collapsedSections: new Set(),
  };

  // ── DOM refs ─────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = {
    loading: $("loadingScreen"),
    error: $("errorScreen"),
    errorMsg: $("errorMessage"),
    statsBar: $("statsBar"),
    statArticles: $("statArticles"),
    statSources: $("statSources"),
    statUpdated: $("statUpdated"),
    cacheBadge: $("cachebadge"),
    crossSections: $("crossSections"),
    sourceSections: $("sourceSections"),
    statusDot: $("statusDot"),
    statusText: $("statusText"),
    countdown: $("countdownTimer"),
    btnRefresh: $("btnRefresh"),
    btnTheme: $("btnTheme"),
    sectionNav: $("sectionNav"),
    backToTop: $("backToTop"),
    toast: $("toast"),
    loadingSources: $("loadingSources"),
  };

  // ── Theme ────────────────────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem("gn-theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("gn-theme", next);
  }

  // ── Utils ────────────────────────────────────────────────────
  function timeAgo(dateStr) {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function escHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg, duration = 3000) {
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(() => el.toast.classList.add("hidden"), duration);
  }

  // ── Status indicator ─────────────────────────────────────────
  function setStatus(type, text) {
    el.statusDot.className = `status-dot ${type}`;
    el.statusText.textContent = text;
  }

  // ── Countdown timer ──────────────────────────────────────────
  function startCountdown() {
    clearInterval(state.countdownInterval);
    state.nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
    state.countdownInterval = setInterval(() => {
      const left = Math.max(0, state.nextRefreshAt - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      el.countdown.textContent = `${m}:${String(s).padStart(2, "0")}`;
      if (left === 0) clearInterval(state.countdownInterval);
    }, 1000);
  }

  // ── Data fetching ────────────────────────────────────────────
  async function fetchNews(force = false) {
    setStatus("loading", "Fetching…");
    el.btnRefresh.classList.add("spinning");

    const url = force ? `${API_BASE}/api/refresh` : `${API_BASE}/api/news`;
    try {
      const res = await fetch(url, { cache: force ? "no-store" : "default" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.error) throw new Error(data.message || data.error);

      state.data = data;
      renderAll(data);
      setStatus("ok", "Live");

      // Schedule next auto-refresh
      clearTimeout(state.refreshTimer);
      state.refreshTimer = setTimeout(() => fetchNews(false), REFRESH_INTERVAL_MS);
      startCountdown();

      if (force) showToast("✓ News refreshed");
    } catch (err) {
      console.error("[App] Fetch error:", err);
      setStatus("error", "Error");

      if (!state.data) {
        // First load failure — show error screen
        el.loading.classList.add("hidden");
        el.error.classList.remove("hidden");
        el.errorMsg.textContent = err.message || "Could not reach server.";
      } else {
        showToast("⚠ Refresh failed — showing cached data");
      }
    } finally {
      el.btnRefresh.classList.remove("spinning");
    }
  }

  async function forceRefresh() {
    clearTimeout(state.refreshTimer);
    await fetchNews(true);
  }

  // ── Render pipeline ──────────────────────────────────────────
  function renderAll(data) {
    el.loading.classList.add("hidden");
    el.error.classList.add("hidden");
    el.statsBar.classList.remove("hidden");
    el.crossSections.classList.remove("hidden");
    el.sourceSections.classList.remove("hidden");

    // Stats bar
    const totalArticles = data.sources?.reduce((sum, s) => sum + s.articles.length, 0) || 0;
    el.statArticles.textContent = `${totalArticles} articles`;
    el.statSources.textContent = `${data.sources?.length || 0} sources`;
    el.statUpdated.textContent = `Updated ${timeAgo(data.last_updated)}`;
    el.cacheBadge.textContent = data.from_cache ? "cached" : "fresh";
    el.cacheBadge.style.display = "";

    // Render cross sections
    renderCrossSections(data.cross_sections || []);

    // Render source sections
    renderSourceSections(data.sources || []);

    // Apply active tab filter
    applyTabFilter(state.activeTab);
  }

  // ── Cross-sections render ────────────────────────────────────
  function renderCrossSections(sections) {
    const colorMap = { tech: "tech", ai: "ai", jobcuts: "jobcuts" };
    el.crossSections.innerHTML = sections.map((section) => `
      <div class="cross-section-block" data-id="${section.id}" data-cross="${section.id}">
        <div class="cross-section-header">
          <h2 class="cross-section-title">${section.icon} ${escHtml(section.name)}</h2>
          <span class="cross-section-count">${section.articles.length} articles</span>
        </div>
        ${section.articles.length
          ? `<div class="cross-section-grid">
              ${section.articles.map((a) => renderCard(a, true)).join("")}
            </div>`
          : `<div class="empty-section">No articles classified in this section yet.<br>
             <small>Try refreshing — AI classification runs on each fetch.</small></div>`
        }
      </div>
    `).join("");
  }

  // ── Source sections render ───────────────────────────────────
  function renderSourceSections(sources) {
    el.sourceSections.innerHTML = sources.map((source) => {
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
              <h2 class="source-name">${flag} ${escHtml(source.name)}</h2>
              <span class="source-region-badge">${source.region}</span>
              <span class="source-category-badge">${icon} ${source.category}</span>
            </div>
            <span class="source-section-count">${source.articles.length} articles</span>
            <span class="source-toggle">▾</span>
          </div>
          <div class="source-articles">
            <div class="card-grid">
              ${source.articles.map((a) => renderCard(a, false)).join("")}
            </div>
          </div>
        </section>
      `;
    }).join("");
  }

  // ── Card render ──────────────────────────────────────────────
  function renderCard(article, showSourceTag) {
    const tagMap = { tech: "tech", ai: "ai", jobcuts: "jobcuts" };
    const sectionTags = (article.cross_sections || [])
      .map((sid) => `<span class="card-tag ${tagMap[sid] || ""}">${sid}</span>`)
      .join("");

    const icon = FALLBACK_ICONS[article.source_category] || FALLBACK_ICONS.default;

    const imageHtml = article.image_url
      ? `<img class="card-image" src="${escHtml(article.image_url)}"
              alt="" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
         <div class="card-image-fallback" style="display:none">
           <div class="card-image-fallback-inner">
             <div class="card-image-fallback-icon">${icon}</div>
             <div class="card-image-fallback-label">${escHtml(article.source_name)}</div>
           </div>
         </div>`
      : `<div class="card-image-fallback">
           <div class="card-image-fallback-inner">
             <div class="card-image-fallback-icon">${icon}</div>
             <div class="card-image-fallback-label">${escHtml(article.source_name)}</div>
           </div>
         </div>`;

    const sourceTag = showSourceTag
      ? `<span class="card-source-tag">${escHtml(article.source_name)} · ${escHtml(article.feed_label || "")}</span>`
      : `<span class="card-source-tag">${escHtml(article.feed_label || "")}</span>`;

    return `
      <article class="news-card">
        <a href="${escHtml(article.article_url)}" target="_blank" rel="noopener noreferrer">
          ${imageHtml}
          <div class="card-body">
            ${sourceTag}
            <h3 class="card-title">${escHtml(article.title)}</h3>
            ${article.summary ? `<p class="card-summary">${escHtml(article.summary)}</p>` : ""}
            <div class="card-footer">
              <span class="card-time">${timeAgo(article.published_at)}</span>
              <div class="card-section-tags">${sectionTags}</div>
              <span class="card-read-more">Read →</span>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  // ── Tab filtering ────────────────────────────────────────────
  function applyTabFilter(tabId) {
    state.activeTab = tabId;

    // Update nav tabs
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.section === tabId);
    });

    const crossBlocks = el.crossSections.querySelectorAll(".cross-section-block");
    const sourceSects = el.sourceSections.querySelectorAll(".source-section");

    if (tabId === "all") {
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach((b) => b.classList.remove("hidden"));
      sourceSects.forEach((s) => s.classList.remove("hidden"));
    } else if (tabId.startsWith("cross-")) {
      const crossId = tabId.replace("cross-", "");
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach((b) => {
        b.classList.toggle("hidden", b.dataset.id !== crossId);
      });
      sourceSects.forEach((s) => s.classList.add("hidden"));
    } else if (tabId.startsWith("region-")) {
      const region = tabId.replace("region-", "");
      el.crossSections.classList.add("hidden");
      sourceSects.forEach((s) => {
        s.classList.toggle("hidden", s.dataset.region !== region);
      });
    }
  }

  // ── Section collapse toggle ──────────────────────────────────
  function toggleSection(sourceId) {
    const section = document.querySelector(`[data-source-id="${sourceId}"]`);
    if (!section) return;
    const isCollapsed = section.classList.toggle("collapsed");
    if (isCollapsed) {
      state.collapsedSections.add(sourceId);
    } else {
      state.collapsedSections.delete(sourceId);
    }
  }

  // ── Populate loading sources ─────────────────────────────────
  function populateLoadingSources() {
    fetch(`${API_BASE}/api/sources`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.sources) return;
        el.loadingSources.innerHTML = d.sources
          .map((s) => `<span class="loading-source-badge">${s.name}</span>`)
          .join("");
      })
      .catch(() => {});
  }

  // ── Back to top ──────────────────────────────────────────────
  function initScrollBehavior() {
    window.addEventListener("scroll", () => {
      el.backToTop.classList.toggle("hidden", window.scrollY < 400);
    }, { passive: true });
    el.backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // ── Event binding ────────────────────────────────────────────
  function bindEvents() {
    el.btnTheme.addEventListener("click", toggleTheme);
    el.btnRefresh.addEventListener("click", forceRefresh);

    // Nav tabs
    el.sectionNav.addEventListener("click", (e) => {
      const tab = e.target.closest(".nav-tab");
      if (tab && tab.dataset.section) applyTabFilter(tab.dataset.section);
    });

    // Keyboard nav
    el.sectionNav.addEventListener("keypress", (e) => {
      const tab = e.target.closest(".nav-tab");
      if (tab && tab.dataset.section && e.key === "Enter") applyTabFilter(tab.dataset.section);
    });
  }

  // ── Public API (for inline onclick handlers) ──────────────────
  window.newsApp = { forceRefresh, toggleSection };

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    initTheme();
    bindEvents();
    initScrollBehavior();
    populateLoadingSources();
    fetchNews(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
