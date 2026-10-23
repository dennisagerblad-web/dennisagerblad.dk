import { timelineEntries } from '../content/timeline/entries.js?v=20261023-mental-health-people-1';
import { stopTimelineMotion } from './timeline-ui.js?v=20261023-mental-health-people-1';

const groups = ['live', 'music', 'art', 'word', 'press'];
export const entryKey = entry => [entry.date, entry.category, entry.title].join('|');
const sourceText = node => (window.DennisLanguage?.sourceText(node) || node?.textContent || '').trim();
function entryForNode(node) {
  const date = node.querySelector('time')?.getAttribute('datetime');
  const title = sourceText(node.querySelector('.life-description'));
  return timelineEntries.find(entry => entry.date === date && (entry.title === title || entry.shortTitle === title));
}
function eventForEntry(shell, entry) {
  return [...shell.querySelectorAll('.life-event')].find(node => entryForNode(node) === entry);
}
// Anchor to a real event rather than a pixel count: another screen has a
// different wrapping, thumbnail size and sticky controls height.
export function addTimelinePosition(url) {
  const shell = document.querySelector('.section-5 .timeline-shell');
  const scroller = shell?.closest('.archive-scroll');
  const group = shell?.dataset.theme;
  if (!groups.includes(group) || !scroller) return url;
  url.searchParams.set('fane', group);
  if (scroller.scrollTop <= 2) return url;
  const line = shell.querySelector('.timeline-controls').getBoundingClientRect().bottom + 16;
  const nodes = [...shell.querySelectorAll('.life-event')];
  const node = nodes.find(node => node.getBoundingClientRect().bottom > line) || nodes.at(-1);
  const entry = node && entryForNode(node);
  if (entry) url.searchParams.set('ved', entryKey(entry));
  return url;
}

window.DennisTimelinePosition = { addToUrl: addTimelinePosition };
window.dispatchEvent(new Event('dennis-timeline-position-ready'));

const params = new URLSearchParams(location.search);
const group = params.get('fane');
const key = params.get('ved');
const entry = timelineEntries.find(entry => entryKey(entry) === key || entry.shareAliases?.includes(key));
// Existing popup links keep their own opening behavior.
if (groups.includes(group) && !params.has('opslag') && /^\/(?:tidslinje\/?)?$/.test(location.pathname)) {
  let attempts = 0;
  const timer = setInterval(() => {
    if (++attempts > 100) { clearInterval(timer); return; }
    const ship = document.querySelector('.ship.section-5.is-open');
    const shell = ship?.querySelector('.timeline-shell');
    if (!shell) return;
    if (shell.dataset.theme !== group) {
      shell.querySelectorAll('.timeline-groups button')[groups.indexOf(group)]?.click();
      return;
    }
    const scroller = shell.closest('.archive-scroll');
    const node = entry && eventForEntry(shell, entry);
    if (!scroller || (entry && !node)) return;
    clearInterval(timer);
    let cancelled = false;
    const place = () => {
      if (cancelled || !shell.isConnected) return;
      stopTimelineMotion();
      scroller.style.scrollBehavior = 'auto';
      if (!node) { scroller.scrollTop = 0; return; }
      const line = shell.querySelector('.timeline-controls').getBoundingClientRect().bottom + 16;
      scroller.scrollTop += node.getBoundingClientRect().top - line;
    };
    const stop = () => {
      cancelled = true;
      observer.disconnect();
      for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) document.removeEventListener(type, stop, true);
    };
    const observer = new ResizeObserver(place);
    observer.observe(shell);
    observer.observe(scroller);
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) document.addEventListener(type, stop, { once: true, capture: true, passive: true });
    place();
    for (const delay of [100, 350, 800, 1500]) setTimeout(place, delay);
    setTimeout(stop, 2200);
  }, 150);
}
