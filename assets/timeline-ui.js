export { timelineThumbDimensions } from './timeline-thumb-dimensions.js';

const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

export function timelineDate(date, fallback = '') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!match) return fallback;
  const month = months[Number(match[2]) - 1];
  return month ? `${Number(match[3])}. ${month} ${match[1]}.` : fallback;
}

export function scrollTimelineYear(category, year, updateHash = false) {
  const scroller = document.querySelector('.section-5 .archive-scroll');
  const target = document.getElementById(`timeline-${category}-${year}`);
  const controls = target?.closest('.timeline-shell')?.querySelector('.timeline-controls');
  if (!scroller || !target || !controls) return;

  // The island stays fixed while the archive scrolls. Measure its visible
  // bottom rather than relying on a viewport-specific scroll-margin.
  const scrollerTop = scroller.getBoundingClientRect().top;
  const stickyTop = Number.parseFloat(getComputedStyle(controls).top) || 0;
  const offset = Math.max(0, stickyTop) + controls.getBoundingClientRect().height + 12;
  const targetTop = target.getBoundingClientRect().top - scrollerTop + scroller.scrollTop;
  scroller.scrollTo({ top: Math.max(0, targetTop - offset), behavior: 'instant' });
  if (updateHash) history.replaceState(null, '', `#timeline-${category}-${year}`);
}
