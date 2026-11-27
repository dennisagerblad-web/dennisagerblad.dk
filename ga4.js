/* GA4 Standard: basic consent mode, no Google request before opt-in. */
(() => {
  'use strict';
  if (window.SiteStatistics) return;
  const script = document.currentScript;
  const measurementId = script?.dataset.measurementId;
  const site = script?.dataset.site;
  const preview = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!/^G-[A-Z0-9]+$/.test(measurementId || '') || !/^[a-z0-9.-]+\.dk$/.test(site || '')) return;
  if (!preview && (location.protocol !== 'https:' || ![site, 'www.' + site].includes(location.hostname))) return;
  const analyticsAllowed = !navigator.globalPrivacyControl && navigator.doNotTrack !== '1';
  const consentCookie = `statistics-choice-${site.replaceAll('.', '-')}`;
  const consentMaxAge = 400 * 24 * 60 * 60;
  const consentScope = preview ? '' : `; Domain=${site}; Secure`;
  let consent = false, started = false, banner, preferenceButton, lastFocus;
  const cleanUrl = (raw, base = location.href) => {
    if (!raw) return '';
    try {
      const url = new URL(raw, base);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      const route = url.searchParams.get('path');
      if (site === 'dunst.dk' && url.origin === location.origin && /\/archive\.html$/.test(url.pathname) &&
          route && /^\/dunst\/[a-z0-9_./-]+\.html?$/i.test(route) && !route.includes('..')) return url.origin + route;
      return url.origin + url.pathname;
    } catch { return ''; }
  };
  function readConsent() {
    const prefix = consentCookie + '=';
    const saved = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
    const choice = saved?.slice(prefix.length);
    return choice === 'granted' || choice === 'denied' ? choice : null;
  }
  function canSend() { return consent && analyticsAllowed; }
  function track(name, params = {}) {
    if (!canSend()) return;
    const data = {send_to: measurementId, ...params};
    if (preview) { window.dispatchEvent(new CustomEvent('statistics-preview', {detail:{name, params:data}})); return; }
    window.gtag?.('event', name, data);
  }
  function clearCookies() {
    const domains = ['', location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    for (const item of document.cookie.split(';')) {
      const name = item.split('=')[0].trim();
      if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) continue;
      for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? '; domain='+domain : ''}`;
    }
  }
  function start() {
    if (started || !canSend()) return;
    started = true;
    if (preview) { track('page_view', {page_location:cleanUrl(location.href), page_title:document.title}); return; }
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.gtag('consent', 'update', {analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {page_location:cleanUrl(location.href), page_referrer:cleanUrl(document.referrer), allow_google_signals:false, allow_ad_personalization_signals:false, cookie_flags:'SameSite=Lax;Secure'});
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.append(tag);
  }
  function choose(choice) {
    const hadConsent = consent;
    consent = choice === 'granted' && analyticsAllowed;
    document.cookie = `${consentCookie}=${choice}; Max-Age=${consentMaxAge}; Path=/; SameSite=Lax${consentScope}`;
    banner.hidden = true;
    preferenceButton.hidden = false;
    if (consent && !hadConsent) {
      window['ga-disable-' + measurementId] = false;
      if (started) {
        if (!preview) window.gtag?.('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
        track('page_view', {page_location:cleanUrl(location.href), page_title:document.title});
      } else start();
    }
    else if (!consent) {
      if (started && !preview) {
        window['ga-disable-' + measurementId] = true;
        window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      }
      clearCookies();
    }
    if (lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
    lastFocus = null;
    if (consent && !hadConsent) recordOpenFrames();
  }
  function show() {
    lastFocus = preferenceButton;
    preferenceButton.hidden = true;
    banner.querySelector('details').open = false;
    banner.hidden = false;
    banner.querySelector('h2').focus({preventScroll:true});
  }
  function attachInteractions(doc) {
    doc.addEventListener('click', event => {
      const target = event.target?.nodeType === 1 ? event.target : null;
      const control = target?.closest('a,button,[role="button"],summary');
      if (!control || control.closest('[data-statistics-ignore],form') || control.matches('[disabled]')) return;
      if (control.closest('.menu-activist,.pispis-layout,.pispis-preview')) return;
      const href = control.getAttribute('href');
      const url = href ? cleanUrl(href, doc.baseURI) : '';
      const contact = /^(mailto|tel):/i.test(href || '');
      if (url && /\/pispis(?:[/.]|$)/i.test(new URL(url).pathname)) return;
      const publicControl = control.closest('.face-menu,.timeline-groups,#full-menu,.tunga-menu');
      const label = contact ? 'Kontakt' : publicControl
        ? (control.getAttribute('aria-label') || control.textContent || '').trim().replace(/\s+/g,' ').slice(0,100)
        : '';
      if (!url && !label) return;
      let destination = url || label;
      if (url) {
        const link = new URL(url);
        if (link.origin === location.origin) {
          const fragment = new URL(href, doc.baseURI).hash;
          destination = link.pathname + (/^#[a-z][a-z0-9_-]{0,59}$/i.test(fragment) ? fragment : '');
        }
      }
      const clickDestination = destination.slice(0,100);
      track('select_content', {
        content_type:contact ? 'contact' : url ? 'link' : 'menu',
        content_id:clickDestination,
        click_destination:clickDestination,
        page_location:cleanUrl(doc.location.href)
      });
    }, {capture:true});
    doc.addEventListener('play', event => {
      if (!['VIDEO','AUDIO'].includes(event.target?.tagName)) return;
      track(event.target.tagName === 'VIDEO' ? 'video_start' : 'audio_start', {content_id:cleanUrl(event.target.currentSrc),page_location:cleanUrl(doc.location.href)});
    }, {capture:true});
  }
  // The top document handles same-origin frames, including frames loaded before this script.
  try { if (window !== window.top && window.top.location.origin === location.origin) return; } catch { return; }
  const frameDocuments = new Map();
  function recordOpenFrames() {
    for (const [frame, doc] of frameDocuments) {
      if (!frame.isConnected || frame.contentDocument !== doc) { frameDocuments.delete(frame); continue; }
      track('page_view',{page_location:cleanUrl(doc.location.href),page_title:doc.title});
    }
  }
  function init() {
    if (!document.body || document.body.tagName === 'FRAMESET' || !analyticsAllowed) return;
    window.SiteStatistics = { showPreferences: show };
    // Section entry pages can return to the homepage without reloading the document.
    document.head.insertAdjacentHTML('beforeend', `<style>
      body:not(:has(#root > .ship:not(.has-section))) > #site-statistics-consent {
        --cookie-settings-display: none;
      }
    </style>`);
    const host = document.createElement('div');
    host.dataset.statisticsIgnore = '';
    host.id = 'site-statistics-consent';
    document.body.append(host);
    const root=host.attachShadow({mode:'open'});
    root.innerHTML = `<style>
      :host {
        all: initial;
        --cookie-blue: #ffbfda;
        --cookie-violet: #ff8fc5;
        --cookie-yellow: #ffd895;
        display: block;
        position: relative;
        z-index: 2147483000;
        font: 16px/1.4 Arial, sans-serif;
      }
      * { box-sizing: border-box; }
      [hidden] { display: none !important; }
      section {
        position: fixed;
        inset: auto 8px max(8px, env(safe-area-inset-bottom));
        max-width: 320px;
        max-height: 85dvh;
        margin: auto;
        overflow: auto;
        border: 1px solid var(--cookie-violet);
        color: #fff4e4;
        background: #171019;
      }
      header {
        position: relative;
        padding: 3px 54px 3px 10px;
        border-bottom: 1px solid var(--cookie-violet);
        color: #291421;
        background: var(--cookie-blue);
      }
      h2 { margin: 0; font-size: 15px; }
      h2:focus { outline: none; }
      .cookie-icon {
        position: absolute;
        top: 4px;
        right: 8px;
        width: 40px;
        height: 40px;
        color: #9b215d;
        pointer-events: none;
      }
      .body { display: flow-root; padding: 6px 10px; font-size: 14px; }
      .choices { float: inline-start; display: flex; gap: 6px; margin-inline-end: 10px; }
      button { font: inherit; cursor: pointer; }
      .choices button {
        min-width: 38px;
        min-height: 27px;
        padding: 2px 7px;
        border: 1px solid #551935;
        color: #551935;
        background: var(--cookie-yellow);
        font-weight: 700;
      }
      summary, section a { color: #ff8fc5; text-decoration: underline; }
      summary { display: inline-block; max-width: 100%; padding-block: 4px; list-style: none; cursor: pointer; }
      summary::-webkit-details-marker { display: none; }
      details > summary::after {
        content: "";
        display: inline-block;
        margin-inline-start: .4em;
        border: .28em solid transparent;
        border-top: .34em solid currentColor;
        border-bottom: 0;
        vertical-align: .14em;
      }
      .read-less, details[open] .read-more { display: none; }
      details[open] .read-less { display: inline; }
      details[open] > summary::after { transform: rotate(180deg); }
      .details-copy { clear: both; padding-top: 5px; }
      p { margin: 0 0 2px; }
      :is(button, summary, a):focus-visible { outline: 2px solid var(--cookie-blue); outline-offset: 2px; }
      section { max-width: 246px; border: 0; border-radius: 12px; color: #fff; background: #c8102e; text-align: center; }
      header { padding: 4px 8px 0; border: 0; color: inherit; background: transparent; }
      .cookie-icon { top: 100%; right: 6px; color: #fff; }
      .body { display: block; min-height: 40px; padding: 5px 48px 5px 7px; }
      .choices { display: inline-flex; float: none; vertical-align: middle; margin-inline-end: 6px; }
      details { display: inline; }
      summary { vertical-align: middle; }
      .choices button { min-width: 33px; min-height: 25px; padding: 2px 6px; border: 0; border-radius: 8px; color: #a10d26; background: #fff; }
      summary, section a { color: #fff; }
      :is(button, summary, a):focus-visible { outline-color: #fff; }
      .settings {
        display: var(--cookie-settings-display, block);
        position: fixed;
        inset: auto calc(16px + env(safe-area-inset-right)) env(safe-area-inset-bottom) auto;
        min-height: 44px;
        padding: 0 4px;
        border: 0;
        color: #ff575f;
        background: transparent;
        font-size: 14px;
        text-decoration: underline;
      }
      .settings:focus-visible { outline-color: currentColor; }
    </style><section role="region" aria-label="Valg af statistikcookies" hidden>
      <header>
        <h2 tabindex="-1">Tillad cookies?</h2>
        <svg class="cookie-icon" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
          <path d="M19 2.7a17.3 17.3 0 1 0 18.3 17.2c-2.2.8-4.3-.1-5.4-1.8-2.7 1.7-5.8.3-6.4-2.7-4.5.5-7.9-3.8-6.3-7.7-2-.7-2.5-3.3-.2-5Z"
            fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
          <g fill="currentColor">
            <circle cx="13" cy="12" r="2.3"/><circle cx="8.5" cy="20.5" r="1.5"/>
            <circle cx="17.8" cy="20.4" r="1.8"/><circle cx="12.7" cy="29" r="2.5"/>
            <circle cx="21" cy="32" r="1.5"/><circle cx="28.5" cy="26.4" r="2.5"/>
            <circle cx="26" cy="5" r="1.5"/><circle cx="31.2" cy="10.3" r="1.9"/>
            <circle cx="35.3" cy="4" r="1.3"/><circle cx="36.3" cy="13.1" r="1.3"/>
          </g>
        </svg>
      </header>
      <div class="body">
        <div class="choices"><button type="button" data-choice="granted" aria-label="Ja, tillad statistikcookies">Ja</button><button type="button" data-choice="denied" aria-label="Nej, afvis statistikcookies">Nej</button></div>
        <details>
          <summary><span class="read-more">Læs mere</span><span class="read-less">Læs mindre</span></summary>
          <div class="details-copy">
            <p>Vi vil gerne se hvordan folk klikker sig rundt på siden.</p>
            <p>Du kan ændre dit valg under Cookiesinstillinger nederst på forsiden.</p>
            <a href="https://policies.google.com/technologies/partner-sites?hl=da" target="_blank" rel="noopener noreferrer">Sådan behandler Google oplysninger</a>
          </div>
        </details>
      </div>
    </section><button type="button" class="settings" hidden>Cookiesinstillinger</button>`;
    banner = root.querySelector('section');
    preferenceButton = root.querySelector('.settings');
    root.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.choice)));
    preferenceButton.addEventListener('click', show);
    const choice=readConsent();
    consent=choice==='granted';
    start();
    const showForReview = preview && new URLSearchParams(location.search).get('cookie-preview') === '1';
    if (!choice || showForReview) banner.hidden = false;
    else preferenceButton.hidden = false;
    attachInteractions(document);
    const seenFrames = new WeakSet();
    function attachFrame(frame) {
      try {
        const doc = frame.contentDocument;
        if (!doc || seenFrames.has(doc) || frame.contentWindow.location.origin !== location.origin) return;
        seenFrames.add(doc);
        attachInteractions(doc);
        // The embedded menu is navigation. Only content documents count as pages.
        if (!/\/tunga_menu\.html$/i.test(doc.location.pathname)) {
          frameDocuments.set(frame, doc);
          track('page_view',{page_location:cleanUrl(doc.location.href),page_title:doc.title});
        }
        doc.addEventListener('load',event=>{if (event.target?.tagName==='IFRAME') attachFrame(event.target);},true);
        doc.querySelectorAll('iframe').forEach(attachFrame);
      } catch {}
    }
    if (site === 'tungamusik.dk') {
      document.addEventListener('load',event=>{if(event.target?.tagName==='IFRAME') attachFrame(event.target);},true);
      document.querySelectorAll('iframe').forEach(attachFrame);
    }
    let previousPopup='';
    const observeContent=()=>{
      const popup=document.querySelector('.timeline-overlay .timeline-popup,.video-overlay [role="dialog"],.literature-overlay [role="dialog"]');
      const title=popup?.getAttribute('aria-label') || popup?.querySelector('h1,h2,h3')?.textContent || '';
      const date=popup?.querySelector('time[datetime],.timeline-popup-date[datetime]')?.getAttribute('datetime') || '';
      const key=popup ? title+'|'+date : '';
      if (key && key!==previousPopup) track('view_content',{content_type:'popup',content_id:key.slice(0,100),page_location:cleanUrl(location.href)});
      previousPopup=key;
    };
    let observerTimer;
    if (site === 'dennisagerblad.dk') {
      new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(observeContent,150);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-label','datetime']});
    }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
