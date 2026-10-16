// Open an existing landing page over the current section, retaining its state and scroll position.
(() => {
  const pages = {'/performance/bol-mig-i-mit-numsehul/': 'Bol Mig I Mit Numsehul', '/video/danmark-har-talent/': 'Dennis Agerblad Band i Danmark har talent', '/video/koebenhavns-vaerste-trash-drag/': 'Københavns værste trash drag'};
  if (window.parent !== window && pages[location.pathname]) {
    const section = new URLSearchParams(location.search).get('from') === 'Video' ? 'Video' : 'Tidslinjen';
    for (const link of document.querySelectorAll('a.back')) {
      link.textContent = '← Tilbage';
      link.addEventListener('click', event => {
        event.preventDefault();
        window.parent.postMessage({ type: 'dennis-close-talent' }, location.origin);
      });
    }
    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      window.parent.postMessage({ type: 'dennis-close-talent' }, location.origin);
    });
    // Chapter links scroll inside the panel without adding extra history entries.
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const target = document.getElementById(link.getAttribute('href').slice(1));
      if (target) { event.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
    for (const link of document.querySelectorAll('a[href^="https://www.youtube.com/"]')) {
      link.target = '_blank'; link.rel = 'noopener';
    }
    return;
  }
  if (!/^\/(?:index\.html|(?:musik|video|performance|kunst|litteratur|tidslinje)\/?)?$/.test(location.pathname)) return;
  let dialog, frame, sourceLink;
  const close = () => {
    if (!dialog) return;
    dialog.close(); dialog.remove(); dialog = null; frame = null;
    sourceLink?.focus({ preventScroll: true });
  };
  const back = () => {
    if (dialog && history.state?.dennisTalentPanel) history.back();
    else close();
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || !pages[new URL(link.href).pathname] || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (dialog) return;
    sourceLink = link;
    const destination = new URL(link.href).pathname;
    const section = link.closest('.section-1') ? 'Video' : 'Tidslinjen';
    dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', pages[destination]);
    const timelinePopup = !!link.closest('.section-5') && destination === '/video/koebenhavns-vaerste-trash-drag/';
    if (timelinePopup) dialog.className = 'timeline-landing-popup';
    else dialog.style.cssText = 'position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;max-width:none;height:100dvh;max-height:none;background:#000;overflow:hidden';
    frame = document.createElement('iframe');
    frame.title = pages[destination] + ' – tilbage til ' + section;
    frame.src = window.DennisLanguage?.localURL(destination + '?from=' + encodeURIComponent(section)) || destination + '?from=' + encodeURIComponent(section);
    frame.style.cssText = 'display:block;border:0;width:100%;height:100%';
    frame.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture';
    dialog.append(frame); document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); back(); });
    if (timelinePopup) dialog.addEventListener('click', event => { if (event.target === dialog) back(); });
    dialog.showModal();
    history.pushState({ ...history.state, dennisTalentPanel: true }, '', window.DennisLanguage?.localURL(destination) || destination);
  }, true);
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === 'dennis-close-talent') back();
  });
  window.addEventListener('popstate', () => { if (dialog) close(); });
})();
