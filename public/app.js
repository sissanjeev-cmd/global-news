/* ══════════════════════════════════════════════════════════════
   GlobalNews — app.js v5
   Hierarchy: Section → Source → Articles
   No empty cards · No paywalled content · Each source once
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const NEWS_JSON  = "./news.json";
  const REFRESH_MS = 15 * 60 * 1000;

  const ICONS = { Newspaper:"📰", Broadcaster:"📡", Magazine:"📖", default:"🌐" };
  const FLAGS = {
    US:"🇺🇸", UK:"🇬🇧", India:"🇮🇳", Europe:"🇪🇺",
    Asia:"🌏", Australia:"🇦🇺", "Middle East":"🌍", default:"🌐",
  };
  const SOURCE_COLORS = {
    nyt:["#111","#222"],               wapo:["#0a1628","#1a2d50"],
    wsj:["#0d1b2a","#1a3a5c"],        guardian:["#052962","#0d3d7a"],
    bbc:["#8b0000","#5a0000"],        cnn:["#aa0000","#7a0000"],
    fox:["#002244","#001530"],        aljazeera:["#155d32","#0a3d20"],
    france24:["#b8001a","#800012"],   dw:["#00477a","#002f52"],
    spiegel:["#aa0000","#7a0000"],    time:["#aa0000","#7a0000"],
    economist:["#aa0000","#7a0000"],  newsweek:["#002b80","#001a52"],
    newyorker:["#111","#222"],        ndtv:["#aa0000","#7a0000"],
    aajtak:["#aa0000","#7a0000"],     indiatoday:["#aa0000","#7a0000"],
    frontline:["#002b80","#001a52"],  toi:["#b32800","#7a1a00"],
    dainikbhaskar:["#b32800","#7a1a00"], chinadaily:["#aa0000","#7a0000"],
    smh:["#002b80","#001a52"],
  };

  // Paywall signals — skip on frontend too (belt & suspenders)
  const PAYWALL = [
    "subscribe","subscription","sign in to read","login to read",
    "members only","premium content","unlock this article","register to read",
  ];

  function isValidArticle(a) {
    if (!a.title || a.title.trim().length < 8) return false;
    if (!a.article_url || !a.article_url.startsWith("http")) return false;
    const t = `${a.title} ${a.summary||""}`.toLowerCase();
    return !PAYWALL.some(p => t.includes(p));
  }

  // ── State ─────────────────────────────────────────────────
  let state = {
    data:null, activeTab:"all",
    refreshTimer:null, countdownInterval:null, nextRefreshAt:null,
    collapsed:new Set(), lastEtag:null,
  };

  const $ = id => document.getElementById(id);
  const el = {
    loading:$("loadingScreen"), error:$("errorScreen"), errorMsg:$("errorMessage"),
    cross:$("crossSections"), sources:$("sourceSections"),
    dot:$("statusDot"), statusTxt:$("statusText"), countdown:$("countdownTimer"),
    btnRefresh:$("btnRefresh"), btnTheme:$("btnTheme"), nav:$("sectionNav"),
    btt:$("backToTop"), toast:$("toast"),
    statA:$("statArticles"), statS:$("statSources"),
    statU:$("statUpdated"), dateEl:$("currentDate"),
  };

  // ── Theme ──────────────────────────────────────────────────
  function initTheme(){
    document.documentElement.setAttribute("data-theme",localStorage.getItem("gn-theme")||"dark");
  }
  function toggleTheme(){
    const n=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",n);
    localStorage.setItem("gn-theme",n);
  }

  // ── Utils ──────────────────────────────────────────────────
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
  function toast(msg,ms=3200){
    el.toast.textContent=msg; el.toast.classList.remove("hidden");
    clearTimeout(el.toast._t); el.toast._t=setTimeout(()=>el.toast.classList.add("hidden"),ms);
  }
  function setStatus(type,text){
    el.dot.className=`status-dot ${type}`; el.statusTxt.textContent=text;
  }
  function setDate(){
    if(el.dateEl) el.dateEl.textContent=new Date().toLocaleDateString("en-US",{
      weekday:"long",year:"numeric",month:"long",day:"numeric"
    });
  }

  // ── Countdown ──────────────────────────────────────────────
  function startCountdown(){
    clearInterval(state.countdownInterval);
    state.nextRefreshAt=Date.now()+REFRESH_MS;
    state.countdownInterval=setInterval(()=>{
      const left=Math.max(0,state.nextRefreshAt-Date.now());
      const m=Math.floor(left/60000),s=Math.floor((left%60000)/1000);
      el.countdown.textContent=`↻ ${m}:${String(s).padStart(2,"0")}`;
    },1000);
  }

  // ── Fetch ──────────────────────────────────────────────────
  async function fetchNews(force=false){
    setStatus("loading","Loading…"); el.btnRefresh.classList.add("spinning");
    try{
      const url=force?`${NEWS_JSON}?t=${Date.now()}`:NEWS_JSON;
      const headers={};
      if(state.lastEtag&&!force)headers["If-None-Match"]=state.lastEtag;
      const res=await fetch(url,{headers,cache:force?"no-store":"default"});
      if(res.status===304){setStatus("ok","Live");if(force)toast("✓ Already up to date");scheduleNext();return;}
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const etag=res.headers.get("ETag"); if(etag)state.lastEtag=etag;
      const data=await res.json();
      state.data=data; renderAll(data); setStatus("ok","Live");
      if(force)toast(`✓ Refreshed — ${data.new_this_run||0} new articles`);
    }catch(err){
      console.error(err); setStatus("error","Error");
      if(!state.data){
        el.loading.classList.add("hidden"); el.error.classList.remove("hidden");
        el.errorMsg.textContent="Could not load news.json — trigger a GitHub Actions run first.";
      }else toast("⚠ Refresh failed — showing last data");
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

  // ── Render all ─────────────────────────────────────────────
  function renderAll(data){
    el.loading.classList.add("hidden"); el.error.classList.add("hidden");
    el.cross.classList.remove("hidden"); el.sources.classList.remove("hidden");

    const total=data.sources?.reduce((s,src)=>s+(src.articles||[]).length,0)||0;
    if(el.statA) el.statA.textContent=`${total} articles`;
    if(el.statS) el.statS.textContent=`${data.sources?.length||0} sources`;
    if(el.statU) el.statU.textContent=
      `Last updated: ${timeAgo(data.last_updated)} · ${data.meta?.ai_enabled?"AI classified":"keyword classified"}`;

    renderCross(data.cross_sections||[]);
    renderSources(data.sources||[]);
    applyTab(state.activeTab);
  }

  // ── Cross sections: H1 Section → H2 Source → cards ────────
  function renderCross(sections){
    el.cross.innerHTML=sections.map(sec=>{
      // Use by_source if available (new build format), else group manually
      const bySource = sec.by_source || groupArticlesBySource(sec.articles||[]);
      const validBySource = bySource
        .map(sg=>({...sg, articles:(sg.articles||[]).filter(isValidArticle)}))
        .filter(sg=>sg.articles.length>0);

      const total=validBySource.reduce((s,sg)=>s+sg.articles.length,0);

      return`
      <div class="cross-section-block" data-id="${sec.id}" data-cross="${sec.id}">
        <div class="cs-heading-row">
          <h2 class="cs-heading">${sec.icon} ${esc(sec.name)}</h2>
          <span class="cs-count">${total} articles</span>
        </div>
        ${validBySource.length===0
          ?`<div class="empty-section">No articles in this section yet — classification runs every 15 min.</div>`
          :validBySource.map(sg=>`
            <div class="cs-source-block">
              <h3 class="cs-source-heading">
                ${esc(sg.source_name||sg.source_id)}
                <span class="cs-source-count">${sg.articles.length}</span>
              </h3>
              <div class="cs-source-grid">${sg.articles.map(a=>card(a,false)).join("")}</div>
            </div>`).join("")}
      </div>`;
    }).join("");
  }

  // Helper: group flat article array by source
  function groupArticlesBySource(articles){
    const map={};
    articles.forEach(a=>{
      if(!map[a.source_id]) map[a.source_id]={source_id:a.source_id,source_name:a.source_name,articles:[]};
      map[a.source_id].articles.push(a);
    });
    return Object.values(map);
  }

  // ── Source sections: ONE heading per source ────────────────
  function renderSources(sources){
    el.sources.innerHTML=sources.map(src=>{
      const articles=(src.articles||[]).filter(isValidArticle);
      if(articles.length===0) return ""; // skip sources with no valid articles
      const flag=FLAGS[src.region]||FLAGS.default;
      const icon=ICONS[src.category]||ICONS.default;
      const collapsed=state.collapsed.has(src.id)?"collapsed":"";
      return`
        <section class="source-section ${collapsed}"
                 data-source-id="${esc(src.id)}"
                 data-region="${esc(src.region)}">
          <div class="source-hdr" role="button" tabindex="0"
               onclick="window.newsApp.toggle('${src.id}')"
               onkeypress="if(event.key==='Enter')window.newsApp.toggle('${src.id}')">
            <div class="source-hdr-left">
              <h2 class="source-name">${flag} ${esc(src.name)}</h2>
              <div class="source-meta">
                <span class="badge-region">${esc(src.region)}</span>
                <span class="badge-cat">${icon} ${esc(src.category)}</span>
              </div>
            </div>
            <div class="source-hdr-right">
              <span class="source-art-count">${articles.length} articles</span>
              <span class="source-chevron">▾</span>
            </div>
          </div>
          <div class="source-articles">
            <div class="card-grid">${articles.map(a=>card(a,false)).join("")}</div>
          </div>
        </section>`;
    }).join("");
  }

  // ── Card — only renders if title+URL valid, no empty cards ─
  function card(article, showSource){
    if(!isValidArticle(article)) return "";

    const tagMap={tech:"tech",ai:"ai",jobcuts:"jobcuts"};
    const icon=ICONS[article.source_category]||ICONS.default;
    const clr=SOURCE_COLORS[article.source_id]||["#1a1e2e","#0d0f12"];
    const grad=`linear-gradient(135deg,${clr[0]},${clr[1]})`;
    const tags=(article.cross_sections||[])
      .map(sid=>`<span class="ctag ${tagMap[sid]||""}">${sid}</span>`).join("");

    const hasImg=!!article.image_url;
    const imgBlock=hasImg
      ?`<img class="card-img" src="${esc(article.image_url)}" alt="" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div class="card-img-fb" style="display:none;--fallback-g:${grad}">
          <div style="text-align:center">
            <span class="fb-icon">${icon}</span>
            <span class="fb-label">${esc(article.source_name)}</span>
          </div>
        </div>`
      :"";

    const feedLine=showSource
      ?`<span class="card-feed">${esc(article.source_name)}${article.feed_label?" · "+esc(article.feed_label):""}</span>`
      :`${article.feed_label?`<span class="card-feed">${esc(article.feed_label)}</span>`:""}`;

    return`
      <article class="news-card${hasImg?"":" no-img"}">
        <a href="${esc(article.article_url)}" target="_blank" rel="noopener noreferrer">
          ${imgBlock}
          <div style="display:flex;flex-direction:column;flex:1">
            ${feedLine}
            <h3 class="card-title">${esc(article.title)}</h3>
            ${article.summary?`<p class="card-summary">${esc(article.summary)}</p>`:""}
            <div class="card-foot">
              <span class="card-time">${timeAgo(article.published_at)}</span>
              <div class="card-tags">${tags}</div>
              <span class="card-read">Read →</span>
            </div>
          </div>
        </a>
      </article>`;
  }

  // ── Tab filter ─────────────────────────────────────────────
  function applyTab(tabId){
    state.activeTab=tabId;
    document.querySelectorAll(".nav-tab").forEach(t=>
      t.classList.toggle("active",t.dataset.section===tabId));

    const cb=el.cross.querySelectorAll(".cross-section-block");
    const ss=el.sources.querySelectorAll(".source-section");

    if(tabId==="all"){
      el.cross.classList.remove("hidden"); cb.forEach(b=>b.classList.remove("hidden"));
      el.sources.classList.remove("hidden"); ss.forEach(s=>s.classList.remove("hidden"));
    }else if(tabId.startsWith("cross-")){
      const id=tabId.replace("cross-","");
      el.cross.classList.remove("hidden");
      cb.forEach(b=>b.classList.toggle("hidden",b.dataset.id!==id));
      el.sources.classList.add("hidden");
    }else if(tabId.startsWith("region-")){
      const region=tabId.replace("region-","");
      el.cross.classList.add("hidden");
      el.sources.classList.remove("hidden");
      ss.forEach(s=>s.classList.toggle("hidden",s.dataset.region!==region));
    }
  }

  function toggleSection(id){
    const s=document.querySelector(`[data-source-id="${id}"]`);
    if(!s)return;
    s.classList.toggle("collapsed")
      ?state.collapsed.add(id):state.collapsed.delete(id);
  }

  function bindEvents(){
    el.btnTheme.addEventListener("click",toggleTheme);
    el.btnRefresh.addEventListener("click",forceRefresh);
    el.nav.addEventListener("click",e=>{
      const t=e.target.closest(".nav-tab");
      if(t?.dataset.section)applyTab(t.dataset.section);
    });
    window.addEventListener("scroll",()=>
      el.btt.classList.toggle("hidden",window.scrollY<500),{passive:true});
    el.btt.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  }

  window.newsApp={forceRefresh,toggle:toggleSection};

  function init(){initTheme();setDate();bindEvents();fetchNews(false);}
  document.readyState==="loading"
    ?document.addEventListener("DOMContentLoaded",init):init();
})();
