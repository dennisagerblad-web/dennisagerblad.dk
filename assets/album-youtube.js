// Identify the embedding site for the YouTube player, in preview and production.
(() => {
  for (const frame of document.querySelectorAll('iframe[data-youtube-src]')) {
    const url = new URL(frame.dataset.youtubeSrc);
    url.hostname = 'www.youtube.com';
    url.searchParams.set('origin', location.origin);
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('playsinline', '1');
    frame.src = url.href;
  }
})();
