// Open the exhibition over the current timeline, preserving its tab and scroll position.
(() => {
  const trashdragPath = '/kunst/trashdrag/';
  if (window.parent !== window && location.pathname === trashdragPath) {
    const section = 'Kunst';
    for (const link of document.querySelectorAll('header a, footer a')) {
      link.textContent = '← Tilbage';
      link.addEventListener('click', event => {
        event.preventDefault();
        window.parent.postMessage({ type: 'dennis-close-trashdrag' }, location.origin);
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
  function installLink() {
    const paragraph = document.querySelector('.section-5 .calendar-biography p:nth-child(4)');
    if (!paragraph || paragraph.querySelector('[data-trashdrag-link]')) return;
    const link = document.createElement('a');
    link.href = trashdragPath;
    link.textContent = 'Trashdrag på Listaskálin';
    link.dataset.trashdragLink = '';
    link.style.cssText = 'color:inherit;text-decoration:underline;text-underline-offset:3px';
    paragraph.append(document.createElement('br'), link);
  }
  new MutationObserver(installLink).observe(document.getElementById('root'), {childList:true,subtree:true});
  installLink();
  let dialog, frame, sourceLink;
  const close = () => {
    if (!dialog) return;
    dialog.close(); dialog.remove(); dialog = null; frame = null;
    sourceLink?.focus({ preventScroll: true });
  };
  const back = () => {
    if (dialog && history.state?.dennisTrashdragPanel) history.back();
    else close();
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || new URL(link.href).pathname !== trashdragPath || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (dialog) return;
    sourceLink = link;
    const section = 'Kunst';
    dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'Trashdrag på Listaskálin');
    dialog.style.cssText = 'position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;max-width:none;height:100dvh;max-height:none;background:#000;overflow:hidden';
    frame = document.createElement('iframe');
    frame.title = 'Trashdrag på Listaskálin – tilbage til ' + section;
    frame.src = trashdragPath + '?from=' + encodeURIComponent(section);
    frame.style.cssText = 'display:block;border:0;width:100%;height:100%';
    frame.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture';
    dialog.append(frame); document.body.append(dialog);
    dialog.addEventListener('cancel', event => { event.preventDefault(); back(); });
    dialog.showModal();
    history.pushState({ ...history.state, dennisTrashdragPanel: true }, '', trashdragPath);
  }, true);
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === 'dennis-close-trashdrag') back();
  });
  window.addEventListener('popstate', () => { if (dialog) close(); });
})();
