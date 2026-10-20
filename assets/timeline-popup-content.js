// A short event description belongs in the Timeline, not in an empty dialog.
export function hasTimelinePopupContent(entry) {
  if (entry.popupContent === false) return false;
  return Boolean(entry.gallery || entry.videoId || entry.href || entry.landingPage || entry.thumbnail ||
    entry.images?.length || entry.albumKey || entry.biography?.length || entry.popupHref);
}
export function timelinePopupParagraphs(entry, paragraphs) {
  const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase('da-DK')
    .replace(/[.,!?;:–—"“”()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const withoutPrepositions = value => normalize(value).split(' ').filter(word => !['i','på','ved','til','af','fra'].includes(word)).join(' ');
  const titles = [entry.title,entry.shortTitle,entry.popupTitle,entry.title?.split(',')[0]].filter(Boolean).map(withoutPrepositions);
  const dates = [entry.display,entry.date].filter(Boolean).map(normalize);
  const seen = new Set();
  const result = paragraphs.map(text => globalThis.window?.DennisLanguage?.danish?.(text) || text).filter(text => {
    const value=normalize(text);
    if (!value || titles.includes(withoutPrepositions(text)) || dates.includes(value) || seen.has(value)) return false;
    seen.add(value); return true;
  });
  // Short archive captions sometimes repeat an entire sentence in the article.
  // Compare complete word sequences, so similar dates or names are not merged.
  return result.filter((text,index) => {
    const value=normalize(text);
    return value.length>200 || value.split(' ').length<6 || !result.some((other,otherIndex)=>
      otherIndex!==index && normalize(other).length>value.length && (` ${normalize(other)} `).includes(` ${value} `));
  });
}
// A maintained event description replaces the archive's old per-photo captions.
// Presse keeps the article itself; photographer credits remain independent copy.
export function timelineGalleryDetails(curated, archive, group) {
  const current = curated?.details || [];
  const old = archive?.details || [];
  if (!current.length || group === 'press') return [...current, ...old];
  const credits = old.filter(text => /^(?:photos?|photo's|fotos?|fotograf|videooptagelser)\s*:/i.test(text))
    .map(text => text.split(/\s+-\s+/)[0].trim())
    .filter(text => {
      const name = text.replace(/^[^:]+:\s*/, '').replace(/[.]+$/, '').toLocaleLowerCase('da-DK');
      return name && !current.some(paragraph => paragraph.toLocaleLowerCase('da-DK').includes(name));
    });
  return [...current, ...new Set(credits)];
}
export function timelinePopupGroup(entry) {
  if (['2012-04-18','2013-02-12','2011-08-14','2008-05-23','2007-11-10'].includes(entry.date)) return 'press';
  if (entry.title==='Fjøllini Dansa, København.' || entry.title==='Loco Mama, MIX-Copenhagen BLOG' || /video marathon/i.test(entry.category)) return 'press';
  if (/video|youtube/i.test(entry.category)) return 'music';
  if (/artist talk/i.test(entry.title) || /litteratur|blog|bøssedanmark|oplæs|læser|læse op/i.test(`${entry.category} ${entry.title}`)) return 'word';
  if (entry.group==='media') return /art exhibition|udstilling|exhibition|installation|textil|kunst/i.test(entry.category) ? 'art' : 'press';
  return entry.group;
}
// Filming events can have a photo gallery without a playable video. A video
// poster alone still must not open an empty player or popup.
export function canOpenTimelinePopup(entry) {
  if (!hasTimelinePopupContent(entry)) return false;
  if (entry.gallery) return true;
  const video = /video/i.test(entry.category) || Boolean(entry.videoId);
  return video
    ? Boolean(entry.videoId || entry.href && (!entry.thumbnail || /video marathon/i.test(entry.category)) || entry.images?.length)
    : Boolean(entry.href || entry.thumbnail || entry.images?.length || entry.biography?.length || entry.albumKey || entry.popupHref);
}
export function timelineInlineDetails(entry) {
  if (!entry.details) return '';
  const normalize = value => String(value).toLocaleLowerCase('da-DK')
    .replace(/[.,!?;:]+/g, '').replace(/\s+/g, ' ').trim();
  return normalize(entry.title).includes(normalize(entry.details)) ? '' : entry.details;
}
