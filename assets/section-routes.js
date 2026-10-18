(() => {
  const sections = [
    { slug: 'musik', index: 0, da: 'Musik', en: 'Music', description: 'Sange, udgivelser og musikalske projekter af Dennis Agerblad.' },
    { slug: 'video', index: 1, da: 'Video', en: 'Video', description: 'Musikvideoer og optagelser med Dennis Agerblad.' },
    { slug: 'performance', index: 2, da: 'Performance', en: 'Performance', description: 'Liveoptrædener og performancekunst af Dennis Agerblad.' },
    { slug: 'litteratur', index: 3, da: 'Litteratur', en: 'Literature', description: 'Tekster og litterære projekter af Dennis Agerblad.' },
    { slug: 'kunst', index: 4, da: 'Kunst', en: 'Art', description: 'Billedkunst og kunstneriske projekter af Dennis Agerblad.' },
    { slug: 'tidslinje', index: 5, da: 'Tidslinje', en: 'Timeline', description: 'En interaktiv tidslinje over Dennis Agerblads liv og kunstneriske arbejde.' }
  ];
  const bySlug = Object.fromEntries(sections.map(section => [section.slug, section]));
  const byIndex = Object.fromEntries(sections.map(section => [section.index, section]));
  const homeTitle = 'Dennis Agerblad – færøsk multikunstner og performer';
  const homeDescription = 'Udforsk Dennis Agerblads kunstneriske univers med musik, performance, billedkunst og en interaktiv tidslinje med billeder, videoer og dokumentation.';
  const root = document.getElementById('root');
  if (!root) return;

  const currentSection = () => {
    const index = /(?:^|\s)section-(\d+)(?:\s|$)/.exec(root.querySelector('.ship')?.className || '')?.[1];
    return index === undefined ? null : byIndex[index];
  };
  const pathSection = () => bySlug[location.pathname.split('/').filter(Boolean)[0]] || null;
  const sectionUrl = section => `/${section.slug}/${location.search}`;
  const setMetadata = section => {
    const title = section ? `${document.documentElement.lang === 'en' ? section.en : section.da} – Dennis Agerblad` : homeTitle;
    document.title = title;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `https://dennisagerblad.dk${section ? `/${section.slug}/` : '/'}`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = section?.description || homeDescription;
  };

  // Keep the existing portal animation while giving each section its own URL.
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const menu = event.target.closest('.face-menu .menu-point');
    if (menu && !menu.disabled) {
      const index = /menu-(\d+)/.exec(menu.className)?.[1];
      const section = byIndex[index];
      if (section && pathSection()?.slug !== section.slug) {
        history.pushState({ section: section.slug }, '', sectionUrl(section));
        setMetadata(section);
      }
      return;
    }
    if (event.target.closest('.door-panel.panel-0, [aria-label="Til forsiden"], [aria-label="Back to the homepage"]') && currentSection()) {
      history.pushState({ section: null }, '', `/${location.search}`);
      setMetadata(null);
    }
  }, true);

  // A direct visit must open its section without relying on a previous visit.
  const oldHash = location.pathname === '/' && location.hash.slice(1);
  if (bySlug[oldHash]) history.replaceState(null, '', sectionUrl(bySlug[oldHash]));
  let initial = pathSection();
  const openInitial = () => {
    if (!initial) return;
    if (currentSection()?.slug === initial.slug) {
      setMetadata(initial);
      initial = null;
      document.getElementById('section-index')?.remove();
      return;
    }
    const button = root.querySelector(`.face-menu .menu-${initial.index}`);
    if (button && !button.disabled) button.click();
  };
  let updateFrame = 0;
  const observer = new MutationObserver(records => {
    const relevant = records.some(record => {
      if (record.type === 'attributes') return record.target.matches('.ship');
      return [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 &&
        (node.matches('.ship,.section-heading,.art-page-heading,.face-menu,a[href^="#"]') ||
          node.querySelector('.ship,.section-heading,.art-page-heading,.face-menu,a[href^="#"]')));
    });
    if (!relevant || updateFrame) return;
    updateFrame = requestAnimationFrame(() => {
      updateFrame = 0;
      openInitial();
      normalizeAnchors();
      updateShare();
    });
  });
  observer.observe(root, { childList: true, attributes: true, attributeFilter: ['class'], subtree: true });
  openInitial();
  window.addEventListener('popstate', () => {
    // Closing a landing-page popup restores this same section and its scroll.
    if (currentSection()?.slug !== pathSection()?.slug) location.reload();
  });

  const wrap = document.createElement('div');
  wrap.className = 'section-share';
  wrap.hidden = true;
  const link = document.createElement('a');
  link.className = 'section-share-link';
  link.setAttribute('data-no-translate', '');
  const feedback = document.createElement('span');
  feedback.className = 'section-share-feedback';
  feedback.setAttribute('role', 'status');
  let feedbackTimer;
  const say = message => {
    feedback.textContent = message;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { feedback.textContent = ''; }, 3500);
  };
  const shareUrl = () => {
    const section = currentSection();
    if (!section) return location.href;
    const url = new URL(`https://dennisagerblad.dk/${section.slug}/`);
    const language = window.DennisLanguage?.current || document.documentElement.lang;
    url.searchParams.set('lang', language === 'en' ? 'en' : 'da');
    if (section.slug === 'tidslinje') window.DennisTimelinePosition?.addToUrl(url);
    return url.href;
  };
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v5C6 8 3 12 3 20c3-5 6-7 11-7v5l8-7z"/></svg>';
  link.innerHTML = `${icon}<span>DEL</span>`;
  link.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const nativeShare = navigator.share && matchMedia('(pointer: coarse)').matches;
    if (!nativeShare && !navigator.clipboard?.writeText) return;
    event.preventDefault();
    if (nativeShare) {
      try { await navigator.share({ title: document.title, url: shareUrl() }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(shareUrl());
      say(document.documentElement.lang === 'en' ? 'Link to this page has been copied' : 'Link til denne side er kopieret');
    } catch {
      say(document.documentElement.lang === 'en' ? 'Right-click to copy the link' : 'Højreklik for at kopiere linket');
    }
  });
  wrap.append(link, feedback);
  document.body.append(wrap);
  let observedArtTitle;
  const artTitleObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
    wrap.style.setProperty('--section-heading-width', `${entries[0].contentRect.width}px`);
  });

  function updateShare() {
    const section = currentSection();
    if (wrap.hidden !== !section) wrap.hidden = !section;
    if (!section) {
      if (wrap.parentElement !== document.body) document.body.append(wrap);
      return;
    }
    if (wrap.dataset.section !== section.slug) wrap.dataset.section = section.slug;
    const url = shareUrl();
    if (link.getAttribute('href') !== url) link.href = url;
    const english = document.documentElement.lang === 'en';
    const caption = english ? 'SHARE' : 'DEL';
    const label = link.querySelector('span');
    if (label.textContent !== caption) label.textContent = caption;
    const description = english ? `Share ${section.en}` : `Del ${section.da}`;
    if (link.getAttribute('aria-label') !== description) link.setAttribute('aria-label', description);
    if (link.title !== description) link.title = description;
    const attachToHeading = section.slug === 'kunst' || section.slug === 'musik' ||
      (section.slug === 'litteratur' && matchMedia('(max-width: 760px) and (orientation: portrait)').matches);
    const heading = attachToHeading && root.querySelector(section.slug === 'kunst' ? '.art-page-heading' : '.ship.has-section .section-heading');
    const parent = heading || document.body;
    if (wrap.parentElement !== parent) parent.append(wrap);
    const closing = !root.querySelector('.ship')?.classList.contains('is-open');
    if (wrap.classList.contains('is-closing') !== closing) wrap.classList.toggle('is-closing', closing);
    if (link.tabIndex !== (closing ? -1 : 0)) link.tabIndex = closing ? -1 : 0;
    if (section.slug === 'kunst' && heading) {
      const title = heading.querySelector('h1');
      if (title) {
        wrap.style.setProperty('--section-heading-width', `${title.getBoundingClientRect().width}px`);
        if (artTitleObserver && observedArtTitle !== title) {
          artTitleObserver.disconnect();
          artTitleObserver.observe(title);
          observedArtTitle = title;
        }
      }
    }
  }
  function normalizeAnchors() {
    if (!pathSection()) return;
    for (const anchor of root.querySelectorAll('a[href^="#"]')) {
      anchor.href = `${location.pathname}${location.search}${anchor.getAttribute('href')}`;
    }
  }
  window.addEventListener('dennis-language-change', () => {
    updateShare();
    setMetadata(currentSection());
  });
  window.addEventListener('resize', updateShare);
  window.addEventListener('dennis-timeline-position-ready', updateShare);
  // Keep copy-link, context-menu and modified-click destinations current too.
  let shareScrollFrame = 0;
  root.addEventListener('scroll', event => {
    if (!event.target.matches?.('.archive-scroll') || currentSection()?.slug !== 'tidslinje' || shareScrollFrame) return;
    shareScrollFrame = requestAnimationFrame(() => { shareScrollFrame = 0; link.href = shareUrl(); });
  }, true);
  for (const type of ['pointerdown', 'focus', 'contextmenu']) link.addEventListener(type, () => { link.href = shareUrl(); });
  updateShare();
})();
