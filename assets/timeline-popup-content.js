// A short event description belongs in the Timeline, not in an empty dialog.
export function hasTimelinePopupContent(entry) {
  return Boolean(entry.gallery || entry.videoId || entry.href || entry.landingPage || entry.thumbnail ||
    entry.images?.length || entry.albumKey || entry.biography?.length || entry.popupHref);
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
