// A short event description belongs in the Timeline, not in an empty dialog.
export function hasTimelinePopupContent(entry) {
  return Boolean(entry.videoId || entry.href || entry.landingPage || entry.thumbnail ||
    entry.images?.length || entry.albumKey || entry.biography?.length || entry.popupHref);
}
export function timelineInlineDetails(entry) {
  if (!entry.details) return '';
  const normalize = value => String(value).toLocaleLowerCase('da-DK')
    .replace(/[.,!?;:]+/g, '').replace(/\s+/g, ' ').trim();
  return normalize(entry.title).includes(normalize(entry.details)) ? '' : entry.details;
}
