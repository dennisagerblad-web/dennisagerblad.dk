// A photo link identifies the original image, so gallery reordering does not
// silently change what a recipient sees. This module has no DOM side effects.
export const timelineEntryKey = entry => [entry.date,entry.category,entry.title].join('|');
export function readTimelinePhotoShare(search, entry) {
  const params=new URLSearchParams(search),key=params.get('opslag'),image=params.get('billede');
  if (!image || image.length>3000 || !(key===timelineEntryKey(entry) || entry.shareAliases?.includes(key))) return null;
  try { new URL(image,'https://example.invalid/'); } catch { return null; }
  return {image,paused:params.get('pause')!=='0'};
}
export function timelineShareURL(entry,{origin,group,language='da',image,paused=true}) {
  const url=new URL('/',origin);
  url.searchParams.set('opslag',timelineEntryKey(entry));
  url.searchParams.set('lang',language==='en'?'en':'da');
  if (image) {
    url.searchParams.set('billede',image);
    url.searchParams.set('pause',paused?'1':'0');
  }
  url.hash=`timeline-${group}-${entry.year}`;
  return url.href;
}
