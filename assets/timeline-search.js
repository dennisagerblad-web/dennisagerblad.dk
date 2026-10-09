import { timelineEntries } from '../content/timeline/entries.js?v=20261009-popup-layout-5';
import { stopTimelineMotion } from './timeline-ui.js?v=20261009-popup-layout-5';

const labels = { live: 'Scene', music: 'Musik', art: 'Kunst', word: 'Ord', press: 'Presse' };
const groupIcons = {
  live: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  art: '<path d="M12 3a9 9 0 1 0 0 18h1.4a2 2 0 0 0 1.7-3.1 1.8 1.8 0 0 1 1.4-2.9h1.2a3.3 3.3 0 0 0 3.3-3.3A8.7 8.7 0 0 0 12 3Z"/><path d="M7.5 10h.01M11 7h.01M16 8h.01M8 14h.01" stroke-width="3" stroke-linecap="round"/>',
  word: '<path d="M12 6C9.5 4 6.5 3.5 3 4v14c3.5-.5 6.5 0 9 2m0-14c2.5-2 5.5-2.5 9-2v14c-3.5-.5-6.5 0-9 2m0-14v14"/>',
  press: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h10M7 15h4M14 15h3"/>',
};
const root = document.getElementById('root');
const mobile = matchMedia('(max-width: 760px)');
const portraitMobile = matchMedia('(max-width: 760px) and (orientation: portrait)');
const mobileLandscape = matchMedia('(max-width: 1100px) and (max-height: 650px) and (orientation: landscape)');
const normalize = value => String(value ?? '')
  .toLocaleLowerCase('da-DK')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replaceAll('æ', 'ae')
  .replaceAll('ø', 'o')
  .replaceAll('å', 'aa');

// Keep this category routing in step with the published TimelineView in site-app.js.
function timelineGroup(entry) {
  if (['2013-02-12', '2011-08-14', '2008-05-23', '2007-11-10'].includes(entry.date)) return 'press';
  if (entry.title === 'Fjøllini Dansa, København.' || entry.title === 'Loco Mama, MIX-Copenhagen BLOG' || /video marathon/i.test(entry.category)) return 'press';
  if (/video|youtube/i.test(entry.category)) return 'music';
  if (/artist talk/i.test(entry.title)) return 'word';
  if (/litteratur|blog|bøssedanmark|oplæs|læser|læse op/i.test(`${entry.category} ${entry.title}`)) return 'word';
  if (entry.group === 'media') return /art exhibition|udstilling|exhibition|installation|textil|kunst/i.test(entry.category) ? 'art' : 'press';
  return entry.group;
}

const positions = new Map();
const entries = timelineEntries.flatMap(entry => {
  const group = timelineGroup(entry);
  if (!labels[group] || (group === 'word' && entry.date === '2019-12-06' && /Sufi Dark Pop Poetry/i.test(entry.title))) return [];
  const key = `${group}-${entry.year}`;
  const ordinal = positions.get(key) || 0;
  positions.set(key, ordinal + 1);
  return [{
    entry, group, ordinal,
    title: entry.shortTitle || entry.title,
    searchable: normalize([entry.title, entry.shortTitle, entry.popupTitle, entry.details, entry.category, entry.date, entry.display, entry.year].join(' ')),
  }];
});

let query = '';
let highlighted;

function findEvent(result) {
  const year = document.getElementById(`timeline-${result.group}-${result.entry.year}`);
  return year?.querySelectorAll('.life-event')[result.ordinal];
}

async function goToResult(result, input, search) {
  input.blur();
  search.classList.remove('is-open');
  input.setAttribute('aria-expanded', 'false');
  const tab = [...document.querySelectorAll('.section-5 .timeline-groups button')]
    .find(button => button.textContent.trim() === labels[result.group]);
  if (!tab) return;
  if (!tab.classList.contains('active')) tab.click();

  let event;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (document.querySelector('.section-5 .timeline-shell')?.dataset.theme === result.group) {
      event = findEvent(result);
      if (event) break;
    }
  }
  if (!event) return;
  stopTimelineMotion();
  const scroller = event.closest('.archive-scroll');
  const controls = event.closest('.timeline-shell')?.querySelector('.timeline-controls');
  if (!scroller || !controls) return;
  // The target can move as thumbnails load or the category finishes laying out.
  // Keep its actual visible edge below the sticky tabs, then stop on user input.
  let cancelled = false;
  const position = () => {
    if (cancelled || !event.isConnected) return;
    const gap = event.getBoundingClientRect().top - controls.getBoundingClientRect().bottom - 16;
    if (Math.abs(gap) > 2) {
      scroller.style.scrollBehavior = 'auto';
      scroller.scrollTop += gap;
    }
  };
  const cancelPositioning = () => { cancelled = true; };
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    scroller.addEventListener(type, cancelPositioning, { once: true, passive: true });
  }
  position();
  requestAnimationFrame(position);
  for (const delay of [180, 500, 1100]) setTimeout(position, delay);
  setTimeout(() => {
    cancelled = true;
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) scroller.removeEventListener(type, cancelPositioning);
  }, 1200);
  highlighted?.classList.remove('timeline-search-hit');
  event.classList.add('timeline-search-hit');
  highlighted = event;
  setTimeout(() => event.classList.remove('timeline-search-hit'), 5000);
}

function mountSearch() {
  const controls = root?.querySelector('.section-5 .timeline-controls');
  if (!controls || controls.querySelector('.timeline-search')) return;

  const search = document.createElement('div');
  search.className = 'timeline-search';
  const groupTabs = controls.querySelector('.timeline-groups');
  let pendingWidth = 0;
  const syncWidth = () => {
    pendingWidth = 0;
    if (!groupTabs?.isConnected || !search.isConnected) return;
    if (portraitMobile.matches) {
      controls.style.transform = '';
      const heading = root.querySelector('.section-5 .section-heading');
      const free = controls.getBoundingClientRect().right - (heading?.getBoundingClientRect().right || 0) - 8;
      search.style.width = `${Math.max(130, free)}px`;
      return;
    }
    if (!mobile.matches) {
      search.style.width = '';
      controls.style.transform = '';
      return;
    }
    controls.style.transform = '';
    if (mobileLandscape.matches) {
      search.style.width = '';
      return;
    }
    const tabsWidth = groupTabs.offsetWidth;
    if (!tabsWidth) return;
    const scale = (innerWidth - 40) / tabsWidth;
    search.style.width = `${tabsWidth * scale}px`;
  };
  const scheduleWidth = () => {
    cancelAnimationFrame(pendingWidth);
    pendingWidth = requestAnimationFrame(syncWidth);
  };
  const field = document.createElement('div');
  field.className = 'timeline-search-field';
  const icon = document.createElement('span');
  icon.className = 'timeline-search-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⌕';
  const input = document.createElement('input');
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = 'Søg i tidslinjen';
  input.setAttribute('aria-label', 'Søg i hele tidslinjen');
  input.setAttribute('aria-controls', 'timeline-search-results');
  input.setAttribute('aria-expanded', 'false');
  input.value = query;
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'timeline-search-clear';
  clearButton.setAttribute('aria-label', 'Ryd søgning');
  clearButton.textContent = '×';
  const panel = document.createElement('div');
  panel.className = 'timeline-search-results';
  panel.id = 'timeline-search-results';
  field.append(icon, input, clearButton);
  search.append(field, panel);
  controls.prepend(search);
  if (groupTabs) {
    new ResizeObserver(scheduleWidth).observe(groupTabs);
  }
  addEventListener('resize', scheduleWidth);
  document.fonts?.ready.then(scheduleWidth);
  scheduleWidth();

  function close() {
    search.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
  }

  function fitResults() {
    if (!search.classList.contains('is-open')) return;
    const viewport = window.visualViewport;
    const bottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight);
    const top = panel.getBoundingClientRect().top;
    panel.style.maxHeight = `${Math.max(72, Math.min(430, bottom - top - 12))}px`;
  }

  function render() {
    query = input.value;
    clearButton.hidden = !query.length;
    panel.replaceChildren();
    const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return close();
    const matches = entries.filter(result => terms.every(term => result.searchable.includes(term)));
    const count = document.createElement('div');
    count.className = 'timeline-search-count';
    count.setAttribute('aria-live', 'polite');
    count.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'resultat' : 'resultater'} fra hele tidslinjen` : 'Ingen resultater';
    panel.append(count);
    if (matches.length) {
      const list = document.createElement('ul');
      for (const result of matches.slice(0, 30)) {
        const item = document.createElement('li');
        item.className = `timeline-search-result-${result.group}`;
        const button = document.createElement('button');
        button.type = 'button';
        const meta = document.createElement('span');
        meta.className = 'timeline-search-result-meta';
        const category = document.createElement('span');
        category.className = 'timeline-search-result-category';
        const categoryIcon = document.createElement('span');
        categoryIcon.className = 'timeline-search-result-icon';
        categoryIcon.setAttribute('aria-hidden', 'true');
        categoryIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${groupIcons[result.group]}</svg>`;
        category.append(categoryIcon, labels[result.group]);
        const date = document.createElement('span');
        date.className = 'timeline-search-result-date';
        date.textContent = result.entry.display;
        meta.append(category, date);
        const title = document.createElement('span');
        title.className = 'timeline-search-result-title';
        title.textContent = result.title;
        button.append(meta, title);
        button.addEventListener('click', () => goToResult(result, input, search));
        item.append(button);
        list.append(item);
      }
      panel.append(list);
      if (matches.length > 30) {
        const more = document.createElement('div');
        more.className = 'timeline-search-more';
        more.textContent = 'Viser de første 30. Skriv mere for at afgrænse søgningen.';
        panel.append(more);
      }
    }
    search.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(fitResults);
  }

  clearButton.addEventListener('click', () => {
    input.value = '';
    render();
    input.focus();
  });
  window.visualViewport?.addEventListener('resize', fitResults);
  window.visualViewport?.addEventListener('scroll', fitResults);
  addEventListener('resize', fitResults);
  input.addEventListener('input', render);
  input.addEventListener('focus', () => { if (query.trim()) render(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); input.blur(); }
    if (event.key === 'Enter') {
      if (matchMedia('(pointer: coarse)').matches || mobile.matches || mobileLandscape.matches) {
        event.preventDefault();
        input.blur();
        requestAnimationFrame(fitResults);
        return;
      }
      const first = panel.querySelector('li button');
      if (first) { event.preventDefault(); first.click(); }
    }
  });
  document.addEventListener('pointerdown', event => {
    if (search.contains(event.target)) return;
    close();
    if (document.activeElement === input) input.blur();
  });
  if (query.trim()) render();
}

if (root) {
  new MutationObserver(mountSearch).observe(root, { childList: true, subtree: true });
  mountSearch();
}
