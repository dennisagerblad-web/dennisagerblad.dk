// Start the existing menu artwork before the application module graph finishes.
(() => {
 const base=new URL('../',document.currentScript.src),seen=new Set();
 function preload(language){
  const files=language==='en'?['en/music.webp','en/video.webp','en/art.webp','en/literature-v2.webp','en/performance.webp','en/timeline.webp']:['musik.webp','video.webp','kunst.webp','litteratur.webp','performance.webp','tidslinje.webp'];
  for(const file of ['name.webp',...files]){
   if(seen.has(file))continue;seen.add(file);
   const link=document.createElement('link');link.rel='preload';link.as='image';link.href=new URL('menu-fast/'+file+'?v=20261029-original-pixels-1',base).href;link.fetchPriority='high';document.head.append(link);
  }
 }
 preload(window.DennisLanguageDefault?.current || 'en');
 window.DennisLanguageDefault?.ready.then(preload);
})();
