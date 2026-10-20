// Local translations. Artwork, recordings and external sites keep their original language.
(() => {
  const siteRoot = new URL('../', document.currentScript.src);
  const sectionEntry = /^\/(?:musik|video|performance|kunst|litteratur|tidslinje)\/?$/.test(location.pathname);
  const dictionary = window.DennisEnglish || {};
  const danishCopy = window.DennisPopupDanish || {};
  const reverseCopy = new Map(Object.entries(dictionary).filter(([da,en])=>da!==en).map(([da,en])=>[en,da]));
  const danish = text => danishCopy[text] || reverseCopy.get(text) || text;
  const originalText = new WeakMap();
  const documentURLs = new WeakMap([[document, location.href]]);
  const originalAttributes = new WeakMap();
  const originalSchema = new WeakMap();
  const videoURLs = new WeakMap();
  const menuWords = { Musik: 'Music', Video: 'Video', Performance: 'Performance', Litteratur: 'Literature', Kunst: 'Art', Tidslinje: 'Timeline' };
  // English words use individually art-directed, image-generated newspaper clippings.
  // Danish originals and approved image-generated rays remain unchanged.
  const menuFiles = { Musik: 'music.webp', Video: 'video.webp', Performance: 'performance.webp', Litteratur: 'literature-v2.webp', Kunst: 'art.webp', Tidslinje: 'timeline.webp' };
  const languageDefault = window.DennisLanguageDefault;
  let language = languageDefault?.current || new URL(location.href).searchParams.get('lang');
  if (!['da', 'en'].includes(language)) {
    try { language = localStorage.getItem('dennis-language'); } catch {}
  }
  language = language === 'da' ? 'da' : 'en';
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
    url.searchParams.set('lang', language);
    return url.href;
  }
  function sourceText(element) {
    if (!element) return '';
    if (element.nodeType === Node.TEXT_NODE) return originalText.get(element)?.source ?? element.textContent;
    return [...element.childNodes].map(sourceText).join('');
  }
  function sourceAttribute(element, name) { return originalAttributes.get(element)?.[name]?.source ?? element?.getAttribute(name); }
  window.DennisLanguage = { translate, english, danish, localURL, sourceText, sourceAttribute, get current() { return language; } };
  function updateText(node) {
    if (!node || !node.textContent.trim() || node.parentElement?.closest('script,style,noscript,textarea,[data-no-translate]')) return;
    const previous = originalText.get(node);
    const raw = previous && node.textContent === previous.last ? previous.source : node.textContent;
    const source = node.parentElement?.closest('.tg-dialog') ? danish(raw) : raw;
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
  // Individually placed image-generated strokes, following the supplied sketch.
  const menuAccents = {
    Musik: [['yellow',30,12,-20],['yellow',35,10,12],['yellow',87,90,22],['yellow',93,86,-22]],
    Video: [['violet',17,13,-65],['violet',23,17,65],['yellow',72,20,-18],['yellow',79,24,22],['violet',83,90,20],['violet',87,92,-24]],
    Kunst: [['violet',25,12,65],['violet',34,15,-65],['violet',76,93,24],['violet',86,91,-24]],
    Litteratur: [['white',12,14,-18],['white',18,18,10],['yellow',88,16,-16],['yellow',93,20,22],['yellow',88,92,20],['yellow',94,89,-22]],
    Performance: [['yellow',83,22,-22],['yellow',88,17,10],['yellow',17,86,22],['yellow',23,90,-22]],
    Tidslinje: [['white',54,15,-18],['white',60,21,20],['white',16,91,22],['white',23,96,-24]]
  };
  const menuInkEdges = {"Musik": [[0.10179, 0.8], [0.15536, 0.79643], [0.16429, 0.8625], [0.16071, 0.82857]], "Video": [[0.18143, 0.86286], [0.17286, 0.84286], [0.22571, 0.81714], [0.19429, 0.87143], [0.19143, 0.87429], [0.19143, 0.88]], "Kunst": [[0.14286, 0.84714], [0.13, 0.85571], [0.19286, 0.87286], [0.19286, 0.87714]], "Litteratur": [[0.17984, 0.80654], [0.20981, 0.80926], [0.23978, 0.80381], [0.26431, 0.80926], [0.23978, 0.80381], [0.26431, 0.80926]], "Performance": [[0.24625, 0.76445], [0.24625, 0.76445], [0.20128, 0.74732], [0.20128, 0.74518]], "Tidslinje": [[0.17345, 0.79872], [0.17345, 0.84368], [0.13704, 0.79015], [0.17559, 0.80728]]};
  // Small individual offsets preserve the reference's hand-placed rhythm.
  const accentRhythm = {
    Musik: { spacing: [20,25], outward: [1,3,2,0] },
    Video: { spacing: [23,20,24], outward: [0,2,2,0,1,3] },
    Kunst: { spacing: [22,19], outward: [2,0,0,2] },
    Litteratur: { spacing: [24,20,26], outward: [0,2,3,1,0,2] },
    Performance: { spacing: [21,24], outward: [2,0,1,3] },
    Tidslinje: { spacing: [25,20], outward: [1,3,2,0] }
  };
  const accentObservers = new WeakMap();
  function positionAccents(image, word) {
    const button = image.closest('.menu-point');
    if (!button || !image.clientWidth || button.dataset.accentLanguage !== 'en') return;
    const specs = menuAccents[word];
    for (const [index, accent] of [...button.querySelectorAll('.english-menu-accent')].entries()) {
      const [, x, , angle] = specs[index];
      const below = index >= specs.length - 2;
      const pair = index - index % 2;
      const pairCentre = image.clientWidth * (specs[pair][1] + specs[pair + 1][1]) / 200;
      const edgeValues = menuInkEdges[word].slice(pair, pair + 2).map(value => value[below ? 1 : 0]);
      const edge = (below ? Math.max(...edgeValues) : Math.min(...edgeValues)) * image.clientHeight;
      const radians = angle * Math.PI / 180;
      const halfHeight = (24 * Math.abs(Math.cos(radians)) + 5 * Math.abs(Math.sin(radians))) / 2;
      const rhythm = accentRhythm[word];
      const halfSpacing = rhythm.spacing[pair / 2] / 2;
      const outward = rhythm.outward[index];
      if (pair === 0 && (word === 'Video' || word === 'Kunst')) {
        const right = word === 'Kunst';
        const halfWidth = (24 * Math.abs(Math.sin(radians)) + 5 * Math.abs(Math.cos(radians))) / 2;
        const sideX = image.clientWidth * (right ? .913 : .051);
        accent.style.left = `${image.offsetLeft + sideX + (right ? 1 : -1) * (5 + halfWidth + outward)}px`;
        accent.style.top = `${image.offsetTop + image.clientHeight * (right ? .5 : .4) + (index % 2 ? halfSpacing : -halfSpacing)}px`;
        continue;
      }
      accent.style.left = `${image.offsetLeft + pairCentre + (index % 2 ? halfSpacing : -halfSpacing)}px`;
      accent.style.top = `${image.offsetTop + edge + (below ? 1 : -1) * (5 + halfHeight + outward)}px`;
    }
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
    const source = language === 'en' ? new URL(`menu-imagegen/20261015/${menuFiles[word]}`, siteRoot).href : image.dataset.danishSrc;
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    const button = image.closest('.menu-point');
    if (button && button.dataset.accentLanguage !== language) {
      button.dataset.accentLanguage = language;
      for (const accent of button.querySelectorAll('.english-menu-accent')) accent.remove();
      if (language === 'en') for (const [index, [colour, x, y, angle]] of (menuAccents[word] || []).entries()) {
        const accent = document.createElement('img');
        accent.className = `english-menu-accent english-menu-accent-${colour}`; accent.alt = ''; accent.setAttribute('aria-hidden', 'true'); accent.draggable = false;
        accent.src = new URL(`menu-imagegen/20261013/stroke-${colour}-rough.webp`, siteRoot).href;
        accent.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
        button.append(accent);
      }
      if (!accentObservers.has(image)) {
        const observer = new ResizeObserver(() => positionAccents(image, word));
        observer.observe(image); accentObservers.set(image, observer);
        image.addEventListener('load', () => positionAccents(image, word));
      }
      positionAccents(image, word);
    }
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
      url.searchParams.set('hl', language === 'en' ? 'en' : 'da');
      const previous = videoURLs.get(frame);
      if (previous === url.href) continue;
      // Never assign src on an attached YouTube iframe. In WebKit that turns
      // each player into a Back-button destination, sometimes at the top level.
      // replace also covers existing players when the visitor changes language.
      if ((previous || frame.src) !== url.href) frame.contentWindow?.location.replace(url.href);
      videoURLs.set(frame, url.href);
    }
    for (const anchor of doc.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
      const url = new URL(href, documentURLs.get(doc));
      if ((url.origin === location.origin || url.hostname === 'dennisagerblad.dk') && !/\.[a-z0-9]{2,5}$/i.test(url.pathname)) updateAttribute(anchor, 'href', value => localURL(value, sectionEntry && doc === document && !value.startsWith('#') ? siteRoot : documentURLs.get(doc)));
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
    languageDefault?.choose(next);
    try { localStorage.setItem('dennis-language', language); } catch {}
    const url = new URL(location.href);
    url.searchParams.set('lang', language);
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
    languageDefault?.ready.then(next => {
      if (languageDefault.current !== next || language === next) return;
      language = next;
      apply(); syncTabs();
      dispatchEvent(new CustomEvent('dennis-language-change', { detail: { language } }));
      dispatchEvent(new Event('resize'));
    });
    new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['alt', 'title', 'aria-label', 'placeholder', 'href', 'src'] });
    // Same-origin historical documents embedded in current-site popups.
    document.addEventListener('load', event => {
      if (event.target.tagName !== 'IFRAME') return;
      if (new URL(event.target.src, location.href).origin !== location.origin) return;
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
