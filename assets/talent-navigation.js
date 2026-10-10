// Open Talent over the current section, retaining its state and scroll position.
(() => {
  const talentPath = '/video/danmark-har-talent/';
  if (window.parent !== window && location.pathname === talentPath) {
    const section = new URLSearchParams(location.search).get('from') === 'Video' ? 'Video' : 'Tidslinjen';
    for (const link of document.querySelectorAll('a.back, footer a')) {
      link.textContent = '← Tilbage til ' + section;
      link.addEventListener('click', event => {
        event.preventDefault();
        window.parent.postMessage({ type: 'dennis-close-talent' }, location.origin);
      });
    }
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
  if (location.pathname !== '/' && location.pathname !== '/index.html') return;
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
    if (!link || new URL(link.href).pathname !== talentPath || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (dialog) return;
    sourceLink = link;
    const section = link.closest('.section-1') ? 'Video' : 'Tidslinjen';
    dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'Dennis Agerblad Band i Danmark har talent');
    dialog.style.cssText = 'position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;max-width:none;height:100dvh;max-height:none;background:#000;overflow:hidden';
    frame = document.createElement('iframe');
    frame.title = 'Danmark har talent – tilbage til ' + section;
    frame.src = talentPath + '?from=' + encodeURIComponent(section);
    frame.style.cssText = 'display:block;border:0;width:100%;height:100%';
    frame.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture';
    dialog.append(frame); document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); back(); });
    dialog.showModal();
    history.pushState({ ...history.state, dennisTalentPanel: true }, '', talentPath);
  }, true);
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === 'dennis-close-talent') back();
  });
  window.addEventListener('popstate', () => { if (dialog) close(); });
})();
