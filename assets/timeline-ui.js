export { timelineThumbDimensions } from './timeline-thumb-dimensions.js?v=20261008-illegal-magazine-1';

const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
let stopKeepingYearInView;
let lastChosenYear;
let cancelTimedScroll;
let lastTopAt = -Infinity;
const timedMobileScroll = matchMedia('(max-width: 760px), (max-width: 1100px) and (max-height: 650px) and (orientation: landscape)');

function scrollWithEaseOut(scroller, destination, duration, onFinish) {
  cancelTimedScroll?.();
  scroller.style.scrollBehavior = 'auto';
  const start = scroller.scrollTop;
  const end = Math.max(0, Math.min(destination, scroller.scrollHeight - scroller.clientHeight));
  if (Math.abs(end - start) < 1) {
    scroller.scrollTop = end;
    onFinish?.();
    return;
  }
  let frame = 0;
  let started;
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) scroller.removeEventListener(type, stop);
    if (cancelTimedScroll === stop) cancelTimedScroll = null;
  };
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) scroller.addEventListener(type, stop, { once: true });
  cancelTimedScroll = stop;
  const tick = now => {
    if (started === undefined) started = now;
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    scroller.scrollTop = start + (end - start) * eased;
    if (progress < 1) frame = requestAnimationFrame(tick);
    else {
      stop();
      onFinish?.();
    }
  };
  frame = requestAnimationFrame(tick);
}

export function timelineDate(date, fallback = '') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!match) return fallback;
  const month = months[Number(match[2]) - 1];
  return month ? `${Number(match[3])}. ${month} ${match[1]}` : fallback;
}

export function scrollTimelineTop() {
  if (performance.now() - lastTopAt < 300) return;
  lastTopAt = performance.now();
  stopKeepingYearInView?.();
  cancelTimedScroll?.();
  lastChosenYear = null;
  const scroller = document.querySelector('.section-5 .archive-scroll');
  if (!scroller) return;
  scroller.style.scrollBehavior = 'auto';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) scroller.scrollTop = 0;
  else if (timedMobileScroll.matches) scrollWithEaseOut(scroller, 0, 1000);
  else scroller.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

export function scrollTimelineYear(category, year, updateHash = false) {
  if (updateHash && lastChosenYear?.category === category && lastChosenYear.year === year && performance.now() - lastChosenYear.at < 300) return;
  if (!updateHash && lastChosenYear?.category === category && performance.now() - lastChosenYear.at < 1500) return;
  lastChosenYear = updateHash ? { category, year, at:performance.now() } : null;
  stopKeepingYearInView?.();
  cancelTimedScroll?.();
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
  let frame = 0;
  let animating = animate;
  const finishAnimation = () => {
    if (!animating) return;
    animating = false;
    const correction = yearPosition();
    if (Math.abs(correction - scroller.scrollTop) > 2) scrollWithEaseOut(scroller, correction, 260);
  };
  if (animate && timedMobileScroll.matches) scrollWithEaseOut(scroller, yearPosition(), 1000, finishAnimation);
  else if (animate) {
    scroller.scrollTo({ top: yearPosition(), behavior: 'smooth' });
    scroller.addEventListener('scrollend', finishAnimation, { once:true });
  } else placeYear();
  if (!updateHash) return;
  history.replaceState(null, '', `#timeline-${category}-${year}`);

  // Eager thumbnails can finish after an immediate year click. Keep the chosen
  // year anchored while their reserved boxes and the opening archive settle.
  const finishFallback = setTimeout(finishAnimation, timedMobileScroll.matches ? 1300 : 1200);
  const schedule = () => {
    if (animating) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const correction = yearPosition();
      if (Math.abs(correction - scroller.scrollTop) > 2) scrollWithEaseOut(scroller, correction, 260);
    });
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
    for (const image of pending) {
      image.removeEventListener('load', schedule);
      image.removeEventListener('error', schedule);
    }
    for (const type of ['wheel','touchstart','pointerdown','keydown']) scroller.removeEventListener(type, stop);
    if (stopKeepingYearInView === stop) stopKeepingYearInView = null;
  };
  for (const type of ['wheel','touchstart','pointerdown','keydown']) scroller.addEventListener(type, stop, { once:true });
  const timeout = setTimeout(stop, 5000);
  stopKeepingYearInView = stop;
}
