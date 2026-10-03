export { timelineThumbDimensions } from './timeline-thumb-dimensions.js?v=timeline-corrections-20260927-v3';

const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
let stopKeepingYearInView;
let lastChosenYear;

export function timelineDate(date, fallback = '') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!match) return fallback;
  const month = months[Number(match[2]) - 1];
  return month ? `${Number(match[3])}. ${month} ${match[1]}` : fallback;
}

export function scrollTimelineTop() {
  stopKeepingYearInView?.();
  lastChosenYear = null;
  const scroller = document.querySelector('.section-5 .archive-scroll');
  if (!scroller) return;
  scroller.style.scrollBehavior = 'auto';
  scroller.scrollTo({
    top: 0,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

export function scrollTimelineYear(category, year, updateHash = false) {
  if (!updateHash && lastChosenYear?.category === category && performance.now() - lastChosenYear.at < 1500) return;
  lastChosenYear = updateHash ? { category, at:performance.now() } : null;
  stopKeepingYearInView?.();
  const scroller = document.querySelector('.section-5 .archive-scroll');
  const target = document.getElementById(`timeline-${category}-${year}`);
  const shell = target?.closest('.timeline-shell');
  const controls = shell?.querySelector('.timeline-controls');
  if (!scroller || !target || !controls) return;
  const oldestYear = [...shell.querySelectorAll('.life-year[id]')].at(-1);
  const scrollToBottom = updateHash && target === oldestYear;

  function yearPosition() {
    if (scrollToBottom) {
      return scroller.scrollHeight - scroller.clientHeight;
    }
    const scrollerTop = scroller.getBoundingClientRect().top;
    const stickyTop = Number.parseFloat(getComputedStyle(controls).top) || 0;
    const offset = Math.max(0, stickyTop) + controls.getBoundingClientRect().height + 12;
    const targetTop = target.getBoundingClientRect().top - scrollerTop + scroller.scrollTop;
    return Math.max(0, targetTop - offset);
  }
  const animate = updateHash && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const placeYear = () => {
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop = yearPosition();
  };
  if (animate) scroller.scrollTo({ top: yearPosition(), behavior: 'smooth' });
  else placeYear();
  if (!updateHash) return;
  history.replaceState(null, '', `#timeline-${category}-${year}`);

  // Eager thumbnails can finish after an immediate year click. Keep the chosen
  // year anchored while their reserved boxes and the opening archive settle.
  let frame = 0;
  let animating = animate;
  const finishAnimation = () => {
    if (!animating) return;
    animating = false;
    placeYear();
  };
  if (animating) scroller.addEventListener('scrollend', finishAnimation, { once:true });
  const finishFallback = setTimeout(finishAnimation, 1200);
  const schedule = () => {
    if (animating) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(placeYear);
  };
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
    clearTimeout(finishFallback);
    scroller.removeEventListener('scrollend', finishAnimation);
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
  const settle = setInterval(() => {
    if (animating) return;
    placeYear();
    if (++attempts === 15) clearInterval(settle);
  }, 50);
  const timeout = setTimeout(stop, 5000);
  stopKeepingYearInView = stop;
}
