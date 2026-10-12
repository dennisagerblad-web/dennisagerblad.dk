// Local translations. Artwork, recordings and external sites keep their original language.
(() => {
  const siteRoot = new URL('../', document.currentScript.src);
  const dictionary = window.DennisEnglish || {};
  const originalText = new WeakMap();
  const documentURLs = new WeakMap([[document, location.href]]);
  const originalAttributes = new WeakMap();
  const originalSchema = new WeakMap();
  const menuWords = { Musik: 'Music', Video: 'Video', Performance: 'Performance', Litteratur: 'Literature', Kunst: 'Art', Tidslinje: 'Timeline' };
  const menuFiles = { Musik: 'music.png', Video: '../menu-original/video.png', Performance: '../menu-edited/performance.png', Litteratur: 'literature.svg', Kunst: 'art.png', Tidslinje: 'timeline.svg' };
  let language = new URL(location.href).searchParams.get('lang');
  if (!['da', 'en'].includes(language)) {
    try { language = localStorage.getItem('dennis-language'); } catch {}
  }
  language = language === 'en' ? 'en' : 'da';
  const months = { januar: 'January', februar: 'February', marts: 'March', april: 'April', maj: 'May', juni: 'June', juli: 'July', august: 'August', september: 'September', oktober: 'October', november: 'November', december: 'December' };
  function english(text) {
    if (Object.hasOwn(dictionary, text)) return dictionary[text];
    const date = /^(\d+)\. (januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december) (\d{4})$/.exec(text);
    if (date) return `${date[1]} ${months[date[2]]} ${date[3]}`;
    const patterns = [
      [/^(.+) — billede (\d+) af (\d+)$/, (_, description, number, total) => `${english(description)} — image ${number} of ${total}`],
      [/^Billeder fra (.+)$/, (_, title) => `Images from ${english(title)}`],
      [/^Årstal for (.+)$/, (_, category) => `Years for ${english(category)}`],
      [/^(\d+) resultater? fra hele tidslinjen$/, (_, count) => `${count} results from the whole timeline`],
      [/^Videoen kan ikke afspilles: (.+)$/, (_, title) => `Video unavailable: ${english(title)}`],
      [/^Pause video: (.+)$/, (_, title) => `Pause video: ${english(title)}`],
      [/^Afspil video: (.+)$/, (_, title) => `Play video: ${english(title)}`],
      [/^Gå til år (\d+)$/, (_, year) => `Go to ${year}`],
      [/^Cover til (.+)$/, (_, title) => `Cover for ${title}`],
      [/^Åbn musiktjenester for (.+)$/, (_, title) => `Open music services for ${title}`],
      [/^Vis (.+)$/, (_, title) => `View ${english(title)}`],
      [/^Åbn (.+)$/, (_, title) => `Open ${english(title)}`],
      [/^Luk (.+)$/, (_, title) => `Close ${english(title)}`],
      [/^(.+) — værk (\d+)$/, (_, title, number) => `${english(title)} — work ${number}`],
      [/^Billede (\d+) af (\d+)$/, (_, number, total) => `Image ${number} of ${total}`],
      [/^Gå til (\d+)$/, (_, year) => `Go to ${year}`],
      [/^(.+) – tilbage til (.+)$/, (_, title, section) => `${english(title)} – back to ${english(section)}`],
    ];
    for (const [pattern, render] of patterns) if (pattern.test(text)) return text.replace(pattern, render);
    return text;
  }
  function translate(text) {
    if (language !== 'en') return String(text ?? '');
    const value = String(text ?? '');
    return value.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, before, content, after) => before + english(content).replace(/Bol mig i mit numsehul/gi, 'Fuck me in my butthole').replace(/Københavns værste trash drag(?!\s*\(Copenhagen’s worst trash drag\))/gi, title => title + ' (Copenhagen’s worst trash drag)') + after);
  }
  function localURL(value, base = documentURLs.get(document)) {
    const url = new URL(value, base);
    if (url.origin !== location.origin && url.hostname !== 'dennisagerblad.dk') return url.href;
    if (language === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    return url.href;
  }
  function sourceText(element) {
    if (!element) return '';
    if (element.nodeType === Node.TEXT_NODE) return originalText.get(element)?.source ?? element.textContent;
    return [...element.childNodes].map(sourceText).join('');
  }
  function sourceAttribute(element, name) { return originalAttributes.get(element)?.[name]?.source ?? element?.getAttribute(name); }
  window.DennisLanguage = { translate, english, localURL, sourceText, sourceAttribute, get current() { return language; } };
  function updateText(node) {
    if (!node || !node.textContent.trim() || node.parentElement?.closest('script,style,noscript,textarea,[data-no-translate]')) return;
    const previous = originalText.get(node);
    const source = previous && node.textContent === previous.last ? previous.source : node.textContent;
    let target = language === 'en' && node.parentElement?.dataset.englishText ? node.parentElement.dataset.englishText : translate(source);
    if (node.parentElement?.closest('.calendar-biography')) target = target.replace('BØSSEDANMARK (GAYDENMARK)', 'BØSSEDANMARK');
    originalText.set(node, { source, last: target });
    if (node.textContent !== target) node.textContent = target;
  }
  function updateAttribute(element, name, render = translate) {
    if (!element.hasAttribute(name)) return;
    let values = originalAttributes.get(element);
    if (!values) originalAttributes.set(element, values = {});
    const value = element.getAttribute(name);
    const previous = values[name];
    const source = previous && previous.last === value ? previous.source : value;
    const target = render(source);
    values[name] = { source, last: target };
    if (target !== value) element.setAttribute(name, target);
  }
  function updateMenu(image) {
    let word = image.dataset.languageWord;
    if (!word) {
      const filename = new URL(image.src).pathname.split('/').at(-1).replace(/\.(png|svg)$/, '');
      word = Object.keys(menuWords).find(word => word.toLowerCase() === filename);
      if (!word) return;
      image.dataset.languageWord = word;
      image.dataset.danishSrc = image.getAttribute('src');
    }
    const source = language === 'en' ? new URL(`menu-english/${menuFiles[word]}`, siteRoot).href : image.dataset.danishSrc;
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
  }
  function apply(doc = document) {
    if (!documentURLs.has(doc)) documentURLs.set(doc, doc.location.href);
    doc.documentElement.lang = language;
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) updateText(walker.currentNode);
    for (const element of doc.querySelectorAll('[alt],[title],[aria-label],[placeholder]')) {
      if (element.closest('[data-no-translate]')) continue;
      for (const name of ['alt', 'title', 'aria-label', 'placeholder']) updateAttribute(element, name);
    }
    for (const image of doc.querySelectorAll('img.collage-word')) updateMenu(image);
    for (const frame of doc.querySelectorAll('iframe[src]')) {
      const url = new URL(frame.getAttribute('src'), documentURLs.get(doc));
      if (!/(^|\.)youtube(?:-nocookie)?\.com$/.test(url.hostname)) continue;
      updateAttribute(frame, 'src', value => {
        const embed = new URL(value, documentURLs.get(doc));
        embed.searchParams.set('hl', language === 'en' ? 'en' : 'da');
        return embed.href;
      });
    }
    for (const anchor of doc.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
      const url = new URL(href, documentURLs.get(doc));
      if ((url.origin === location.origin || url.hostname === 'dennisagerblad.dk') && !/\.[a-z0-9]{2,5}$/i.test(url.pathname)) updateAttribute(anchor, 'href', value => localURL(value, documentURLs.get(doc)));
    }
    // Page title and social descriptions use the same reviewed translations.
    for (const element of doc.querySelectorAll('title,meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[property="og:image:alt"],meta[name="twitter:title"],meta[name="twitter:description"],meta[name="twitter:image:alt"]')) {
      if (element.tagName === 'TITLE') updateText(element.firstChild);
      else updateAttribute(element, 'content');
    }
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      let source = originalSchema.get(script);
      if (!source) { try { source = JSON.parse(script.textContent); originalSchema.set(script, source); } catch { continue; } }
      function translatedSchema(value, key) {
        if (Array.isArray(value)) return key === 'inLanguage' ? value : value.map(item => translatedSchema(item, key));
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, translatedSchema(v,k)]));
        if (key === 'inLanguage' && value === 'da') return language === 'en' ? 'en' : value;
        if (['name','description','headline','caption'].includes(key) && typeof value === 'string') return translate(value);
        return value;
      }
      const content = JSON.stringify(translatedSchema(source));
      if (script.textContent !== content) script.textContent = content;
    }
    const locale = doc.querySelector('meta[property="og:locale"]');
    if (locale) updateAttribute(locale, 'content', () => language === 'en' ? 'en_GB' : 'da_DK');
    doc.documentElement.dataset.siteLanguage = language;
  }
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    queueMicrotask(() => { pending = false; apply(); });
  }
  function setLanguage(next) {
    language = next;
    try { localStorage.setItem('dennis-language', language); } catch {}
    const url = new URL(location.href);
    if (language === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
    history.replaceState(history.state, '', url);
    apply();
    syncTabs();
    dispatchEvent(new CustomEvent('dennis-language-change', { detail: { language } }));
    dispatchEvent(new Event('resize'));
  }
  let tabs;
  function syncTabs() {
    tabs?.querySelectorAll('button').forEach(button => {
      const selected = button.dataset.language === language;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.classList.toggle('is-active', selected);
    });
    if (tabs) tabs.dataset.selected = language;
  }
  function mountTabs() {
    if (!document.getElementById('root') || window.parent !== window) return;
    tabs = document.createElement('nav');
    tabs.className = 'language-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Language / Sprog');
    tabs.dataset.noTranslate = '';
    const marker = document.createElement('span');
    marker.className = 'language-tab-marker'; marker.setAttribute('aria-hidden', 'true'); tabs.append(marker);
    for (const [code, label] of [['en', 'English'], ['da', 'Dansk']]) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = label; button.lang = code; button.dataset.language = code;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'root');
      button.addEventListener('click', () => setLanguage(code));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const code = event.key === 'Home' ? 'en' : event.key === 'End' ? 'da' : language === 'en' ? 'da' : 'en';
        setLanguage(code); tabs.querySelector(`[data-language="${code}"]`).focus();
      });
      tabs.append(button);
    }
    document.body.append(tabs); syncTabs();
  }
  function boot() {
    mountTabs(); apply();
    new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['alt', 'title', 'aria-label', 'placeholder', 'href', 'src'] });
    // Same-origin historical documents embedded in current-site popups.
    document.addEventListener('load', event => {
      if (event.target.tagName !== 'IFRAME') return;
      try {
        const doc = event.target.contentDocument;
        if (doc?.body && !doc.documentElement.dataset.siteLanguage) {
          apply(doc);
          new MutationObserver(() => apply(doc)).observe(doc.body, { subtree: true, childList: true, characterData: true });
        }
      } catch {}
    }, true);
  }
  document.documentElement.lang = language;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
