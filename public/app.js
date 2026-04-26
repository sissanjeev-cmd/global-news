/* ═══════════════════════════════════════════════════════════════
   Global News — app.js  v4
   Newspaper-style · correct grouping · text-only cards
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const NEWS_JSON  = "./news.json";
  const REFRESH_MS = 15 * 60 * 1000;

  const ICONS = { Newspaper:"📰", Broadcaster:"📡", Magazine:"📖", default:"🌐" };
  const FLAGS = {
    US:"🇺🇸", UK:"🇬🇧", India:"🇮🇳", Europe:"🇪🇺",
    Asia:"🌏", Australia:"🇦🇺", "Middle East":"🌍", default:"🌐",
  };
  const COLORS = {
    nyt:["#1a1a1a","#2d2d2d"],         wapo:["#0a1628","#1a2d50"],
    wsj:["#0d1b2a","#1a3a5c"],         guardian:["#052962","#0d3d7a"],
    bbc:["#8b0000","#5a0000"],         cnn:["#aa0000","#7a0000"],
    fox:["#002244","#001530"],         aljazeera:["#155d32","#0a3d20"],
    france24:["#b8001a","#800012"],    dw:["#00477a","#002f52"],
    spiegel:["#aa0000","#7a0000"],     time:["#aa0000","#7a0000"],
    economist:["#aa0000","#7a0000"],   newsweek:["#002b80","#001a52"],
    newyorker:["#1a1a1a","#2d2d2d"],  ndtv:["#aa0000","#7a0000"],
    aajtak:["#aa0000","#7a0000"],      indiatoday:["#aa0000","#7a0000"],
    frontline:["#002b80","#001a52"],   toi:["#b32800","#7a1a00"],
    dainikbhaskar:["#b32800","#7a1a00"], chinadaily:["#aa0000","#7a0000"],
    smh:["#002b80","#001a52"],
  };

  // ── State ─────────────────────────────────────────────────────
  let state = {
    data:null, activeTab:"all",
    refreshTimer:null, countdownInterval:null, nextRefreshAt:null,
    collapsedSections:new Set(), lastEtag:null,
  };

  // ── DOM ───────────────────────────────────────────────────────
  const $  = id => document.getElementById(id);
  const el = {
    loading:$("loadingScreen"), error:$("errorScreen"), errorMsg:$("errorMessage"),
    crossSections:$("crossSections"), sourceSections:$("sourceSections"),
    statusDot:$("statusDot"), statusText:$("statusText"), countdown:$("countdownTimer"),
    btnRefresh:$("btnRefresh"), btnTheme:$("btnTheme"), sectionNav:$("sectionNav"),
    backToTop:$("backToTop"), toast:$("toast"),
    statArticles:$("statArticles"), statSources:$("statSources"),
    statUpdated:$("statUpdated"), currentDate:$("currentDate"),
  };

  // ── Theme ─────────────────────────────────────────────────────
  function initTheme(){
    document.documentElement.setAttribute("data-theme", localStorage.getItem("gn-theme")||"dark");
  }
  function toggleTheme(){
    const n = document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",n);
    localStorage.setItem("gn-theme",n);
  }

  // ── Utils ─────────────────────────────────────────────────────
  function timeAgo(d){
    if(!d)return"—";
    const m=Math.floor((Date.now()-new Date(d))/60000);
    if(m<1)return"just now"; if(m<60)return`${m}m ago`;
    const h=Math.floor(m/60); if(h<24)return`${h}h ago`;
    return`${Math.floor(h/24)}d ago`;
  }
  function esc(s){
    if(!s)return"";
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function showToast(msg,ms=3000){
    el.toast.textContent=msg; el.toast.classList.remove("hidden");
    clearTimeout(el.toast._t); el.toast._t=setTimeout(()=>el.toast.classList.add("hidden"),ms);
  }
  function setStatus(type,text){
    el.statusDot.className=`status-dot ${type}`; el.statusText.textContent=text;
  }
  function setDate(){
    if(el.currentDate) el.currentDate.textContent=new Date().toLocaleDateString("en-US",{
      weekday:"long",year:"numeric",month:"long",day:"numeric"
    });
  }

  // ── Countdown ─────────────────────────────────────────────────
  function startCountdown(){
    clearInterval(state.countdownInterval);
    state.nextRefreshAt=Date.now()+REFRESH_MS;
    state.countdownInterval=setInterval(()=>{
      const left=Math.max(0,state.nextRefreshAt-Date.now());
      const m=Math.floor(left/60000),s=Math.floor((left%60000)/1000);
      el.countdown.textContent=`${m}:${String(s).padStart(2,"0")}`;
    },1000);
  }

  // ── Fetch ─────────────────────────────────────────────────────
  async function fetchNews(force=false){
    setStatus("loading","Loading…");
    el.btnRefresh.classList.add("spinning");
    try{
      const url=force?`${NEWS_JSON}?t=${Date.now()}`:NEWS_JSON;
      const headers={};
      if(state.lastEtag&&!force)headers["If-None-Match"]=state.lastEtag;
      const res=await fetch(url,{headers,cache:force?"no-store":"default"});
      if(res.status===304){setStatus("ok","Live");if(force)showToast("✓ Already up to date");scheduleNext();return;}
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const etag=res.headers.get("ETag"); if(etag)state.lastEtag=etag;
      const data=await res.json();
      state.data=data; renderAll(data); setStatus("ok","Live");
      if(force)showToast(`✓ Refreshed — ${data.new_this_run||0} new articles`);
    }catch(err){
      console.error(err); setStatus("error","Error");
      if(!state.data){
        el.loading.classList.add("hidden"); el.error.classList.remove("hidden");
        el.errorMsg.textContent="Could not load news.json. Trigger a GitHub Actions run.";
      }else showToast("⚠ Refresh failed — showing last data");
    }finally{
      el.btnRefresh.classList.remove("spinning"); scheduleNext();
    }
  }
  function scheduleNext(){
    clearTimeout(state.refreshTimer);
    state.refreshTimer=setTimeout(()=>fetchNews(false),REFRESH_MS);
    startCountdown();
  }
  function forceRefresh(){clearTimeout(state.refreshTimer);fetchNews(true);}

  // ── Render all ────────────────────────────────────────────────
  function renderAll(data){
    el.loading.classList.add("hidden"); el.error.classList.add("hidden");
    el.crossSections.classList.remove("hidden"); el.sourceSections.classList.remove("hidden");

    const total=data.sources?.reduce((s,src)=>s+src.articles.length,0)||0;
    if(el.statArticles) el.statArticles.textContent=`${total} articles`;
    if(el.statSources)  el.statSources.textContent=`${data.sources?.length||0} sources`;
    if(el.statUpdated)  el.statUpdated.textContent=`Last updated: ${timeAgo(data.last_updated)} · ${data.meta?.ai_enabled?"AI classified":"keyword classified"}`;

    renderCrossSections(data.cross_sections||[]);
    renderSourceSections(data.sources||[]);
    applyTabFilter(state.activeTab);
  }

  // ── Cross sections ────────────────────────────────────────────
  function renderCrossSections(sections){
    el.crossSections.innerHTML=sections.map(s=>`
      <div class="cross-section-block" data-id="${s.id}" data-cross="${s.id}">
        <div class="cross-section-header">
          <h2 class="cross-section-title">${s.icon} ${esc(s.name)}</h2>
          <span class="cross-section-count">${s.articles.length} articles</span>
        </div>
        <div class="cross-section-body">
          ${s.articles.length
            ?`<div class="cross-section-grid">${s.articles.map(a=>card(a,true)).join("")}</div>`
            :`<div class="empty-section">No articles in this section yet.<br>Classification runs every 15 minutes via GitHub Actions.</div>`}
        </div>
      </div>`).join("");
  }

  // ── Source sections — ONE heading per source, all articles in one grid ──
  function renderSourceSections(sources){
    el.sourceSections.innerHTML=sources.map(source=>{
      const flag=FLAGS[source.region]||FLAGS.default;
      const icon=ICONS[source.category]||ICONS.default;
      const collapsed=state.collapsedSections.has(source.id)?"collapsed":"";
      return`
        <section class="source-section ${collapsed}"
                 data-source-id="${source.id}"
                 data-region="${esc(source.region)}">
          <div class="source-section-header"
               role="button" tabindex="0"
               onclick="window.newsApp.toggleSection('${source.id}')"
               onkeypress="if(event.key==='Enter')window.newsApp.toggleSection('${source.id}')">
            <div class="source-name-wrap">
              <h2 class="source-name">${flag} ${esc(source.name)}</h2>
              <div class="source-badges">
                <span class="source-region-badge">${esc(source.region)}</span>
                <span class="source-category-badge">${icon} ${esc(source.category)}</span>
              </div>
            </div>
            <div class="source-header-right">
              <span class="source-article-count">${source.articles.length} articles</span>
              <span class="source-toggle">▾</span>
            </div>
          </div>
          <div class="source-articles">
            <div class="card-grid">
              ${source.articles.map(a=>card(a,false)).join("")}
            </div>
          </div>
        </section>`;
    }).join("");
  }

  // ── Card ──────────────────────────────────────────────────────
  function card(article,showSource){
    const tagMap={tech:"tech",ai:"ai",jobcuts:"jobcuts"};
    const icon=ICONS[article.source_category]||ICONS.default;
    const clr=COLORS[article.source_id]||["#1a1e2e","#0d0f12"];
    const grad=`linear-gradient(135deg,${clr[0]} 0%,${clr[1]} 100%)`;
    const tags=(article.cross_sections||[])
      .map(sid=>`<span class="card-tag ${tagMap[sid]||""}">${sid}</span>`).join("");

    const hasImg=!!article.image_url;

    const imgBlock=hasImg
      ?`<img class="card-image" src="${esc(article.image_url)}" alt="" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div class="card-image-fallback" style="display:none;--fallback-gradient:${grad}">
          <div class="card-image-fallback-inner">
            <span class="card-fb-icon">${icon}</span>
            <span class="card-fb-label">${esc(article.source_name)}</span>
          </div>
        </div>`
      :""; // No image = no placeholder at all

    const feedTag=showSource
      ?`<span class="card-feed-label">${esc(article.source_name)}${article.feed_label?" · "+esc(article.feed_label):""}</span>`
      :`${article.feed_label?`<span class="card-feed-label">${esc(article.feed_label)}</span>`:""}`;

    return`
      <article class="news-card${hasImg?"":" no-image"}">
        <a href="${esc(article.article_url)}" target="_blank" rel="noopener noreferrer">
          ${imgBlock}
          <div class="card-body">
            ${feedTag}
            <h3 class="card-title">${esc(article.title)}</h3>
            ${article.summary?`<p class="card-summary">${esc(article.summary)}</p>`:""}
            <div class="card-footer">
              <span class="card-time">${timeAgo(article.published_at)}</span>
              <div class="card-tags">${tags}</div>
              <span class="card-read">Read →</span>
            </div>
          </div>
        </a>
      </article>`;
  }

  // ── Tab filtering ─────────────────────────────────────────────
  function applyTabFilter(tabId){
    state.activeTab=tabId;
    document.querySelectorAll(".nav-tab").forEach(t=>
      t.classList.toggle("active",t.dataset.section===tabId));

    const crossBlocks=el.crossSections.querySelectorAll(".cross-section-block");
    const sourceSects=el.sourceSections.querySelectorAll(".source-section");

    if(tabId==="all"){
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach(b=>b.classList.remove("hidden"));
      el.sourceSections.classList.remove("hidden");
      sourceSects.forEach(s=>s.classList.remove("hidden"));
    }else if(tabId.startsWith("cross-")){
      const id=tabId.replace("cross-","");
      el.crossSections.classList.remove("hidden");
      crossBlocks.forEach(b=>b.classList.toggle("hidden",b.dataset.id!==id));
      el.sourceSections.classList.add("hidden");
    }else if(tabId.startsWith("region-")){
      const region=tabId.replace("region-","");
      el.crossSections.classList.add("hidden");
      el.sourceSections.classList.remove("hidden");
      sourceSects.forEach(s=>s.classList.toggle("hidden",s.dataset.region!==region));
    }
  }

  // ── Section collapse ──────────────────────────────────────────
  function toggleSection(id){
    const s=document.querySelector(`[data-source-id="${id}"]`);
    if(!s)return;
    s.classList.toggle("collapsed")
      ?state.collapsedSections.add(id)
      :state.collapsedSections.delete(id);
  }

  // ── Events ────────────────────────────────────────────────────
  function bindEvents(){
    el.btnTheme.addEventListener("click",toggleTheme);
    el.btnRefresh.addEventListener("click",forceRefresh);
    el.sectionNav.addEventListener("click",e=>{
      const t=e.target.closest(".nav-tab");
      if(t?.dataset.section)applyTabFilter(t.dataset.section);
    });
    window.addEventListener("scroll",()=>
      el.backToTop.classList.toggle("hidden",window.scrollY<500),{passive:true});
    el.backToTop.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  }

  window.newsApp={forceRefresh,toggleSection};

  function init(){initTheme();setDate();bindEvents();fetchNews(false);}
  document.readyState==="loading"
    ?document.addEventListener("DOMContentLoaded",init):init();
})();
