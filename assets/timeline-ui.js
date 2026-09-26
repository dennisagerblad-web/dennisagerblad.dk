export { timelineThumbDimensions } from './timeline-thumb-dimensions.js';

const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
let stopKeepingYearInView;

export function timelineDate(date, fallback = '') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!match) return fallback;
  const month = months[Number(match[2]) - 1];
  return month ? `${Number(match[3])}. ${month} ${match[1]}.` : fallback;
}

export function scrollTimelineYear(category, year, updateHash = false) {
  stopKeepingYearInView?.();
  const scroller = document.querySelector('.section-5 .archive-scroll');
  const target = document.getElementById(`timeline-${category}-${year}`);
  const shell = target?.closest('.timeline-shell');
  const controls = shell?.querySelector('.timeline-controls');
  if (!scroller || !target || !controls) return;

  function placeYear() {
    const scrollerTop = scroller.getBoundingClientRect().top;
    const stickyTop = Number.parseFloat(getComputedStyle(controls).top) || 0;
    const offset = Math.max(0, stickyTop) + controls.getBoundingClientRect().height + 12;
    const targetTop = target.getBoundingClientRect().top - scrollerTop + scroller.scrollTop;
    // Override the base sheet's smooth behavior even during initial loading.
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop = Math.max(0, targetTop - offset);
  }
  placeYear();
  if (updateHash) history.replaceState(null, '', `#timeline-${category}-${year}`);

  // Eager thumbnails can finish after an immediate year click. Keep the chosen
  // year anchored while their reserved boxes and the opening archive settle.
  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(placeYear); };
  const observer = new ResizeObserver(schedule);
  observer.observe(shell);
  observer.observe(scroller);
  const pending = [...shell.querySelectorAll('.timeline-thumbnail')].filter(image => !image.complete);
  for (const image of pending) {
    image.addEventListener('load', schedule, { once:true });
    image.addEventListener('error', schedule, { once:true });
  }
  const stop = () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    clearInterval(settle);
    for (const image of pending) {
      image.removeEventListener('load', schedule);
      image.removeEventListener('error', schedule);
    }
    for (const type of ['wheel','touchstart','pointerdown','keydown']) scroller.removeEventListener(type, stop);
    if (stopKeepingYearInView === stop) stopKeepingYearInView = null;
  };
  for (const type of ['wheel','touchstart','pointerdown','keydown']) scroller.addEventListener(type, stop, { once:true });
  let attempts = 0;
  const settle = setInterval(() => { placeYear(); if (++attempts === 15) clearInterval(settle); }, 50);
  const timeout = setTimeout(stop, 5000);
  stopKeepingYearInView = stop;
}
