// Keep the mobile year list below the sticky tabs in portrait.
const root = document.getElementById('root');
const mobile = matchMedia('(max-width: 760px)');
const mobilePortrait = matchMedia('(max-width: 760px) and (orientation: portrait)');
const mobileLandscape = matchMedia('(max-width: 1100px) and (max-height: 650px) and (orientation: landscape)');
let pending = 0;
let pendingPill = 0;
let manualRailUntil = 0;

function updatePosition(rail, firstYear) {
  const shell = firstYear.closest('.timeline-shell');
  const scroller = firstYear.closest('.archive-scroll');
  const controls = shell?.querySelector('.timeline-controls');
  if (!shell || !scroller || !controls) return;

  const links = [...rail.querySelectorAll('a')];
  const stops = links.map((link, index) => {
    const target = index ? document.getElementById(link.getAttribute('href')?.slice(1)) : null;
    if (index && !target) return null;
    return {
      link,
      y: link.offsetTop + link.offsetHeight / 2,
      position: target
        ? target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
        : 0,
    };
  }).filter(Boolean);
  if (!stops.length) return;

  let marker = rail.querySelector('.timeline-year-position');
  if (!marker) {
    marker = document.createElement('span');
    marker.className = 'timeline-year-position';
    marker.setAttribute('aria-hidden', 'true');
    rail.append(marker);
  }

  const stickyOffset = Math.max(0, Number.parseFloat(getComputedStyle(controls).top) || 0)
    + controls.getBoundingClientRect().height + 12;
  const position = scroller.scrollTop + stickyOffset;
  const atBottom = scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 2;
  let index = 0;
  while (index < stops.length - 1 && position + 2 >= stops[index + 1].position) index++;
  const next = stops[Math.min(index + 1, stops.length - 1)];
  const fraction = next === stops[index] || atBottom ? 0
    : Math.max(0, Math.min(1, (position - stops[index].position) / (next.position - stops[index].position || 1)));
  const y = atBottom ? stops.at(-1).y : index === 0 ? stops[0].y
    : stops[index].y + (next.y - stops[index].y) * fraction;
  rail.style.setProperty('--timeline-year-marker-y', `${y}px`);

  const margin = 14;
  if (performance.now() >= manualRailUntil) {
    if (y - rail.scrollTop < margin) rail.scrollTop = Math.max(0, y - margin);
    else if (y - rail.scrollTop > rail.clientHeight - margin) rail.scrollTop = y - rail.clientHeight + margin;
  }
}

function updateRail() {
  pending = 0;
  const rail = document.querySelector('.timeline-year-rail');
  const firstYear = root?.querySelector('.section-5 .life-year');
  if (!rail || !firstYear) return;
  if (mobile.matches) {
    if (mobilePortrait.matches) {
      const controls = firstYear.closest('.timeline-shell')?.querySelector('.timeline-controls');
      if (controls) {
        rail.style.setProperty('--timeline-rail-top', `${Math.max(0, controls.getBoundingClientRect().bottom + 20)}px`);
      }
    } else {
      const stickyTop = Math.min(135, Math.max(105, innerHeight * .15));
      const firstCardTop = firstYear.getBoundingClientRect().top;
      rail.style.setProperty('--timeline-rail-top', `${Math.max(stickyTop, firstCardTop)}px`);
    }
  } else {
    rail.style.removeProperty('--timeline-rail-top');
  }
  rail.classList.add('is-with-timeline');
  updatePosition(rail, firstYear);
}

function scheduleRail() {
  if (!pending) pending = requestAnimationFrame(updateRail);
}

function updatePill() {
  pendingPill = 0;
  const group = root?.querySelector('.section-5 .timeline-groups');
  const active = group?.querySelector('button.active');
  if (!active) return;
  const controls = group.closest('.timeline-controls');
  if ((mobile.matches || mobileLandscape.matches) && controls) {
    const scale = mobileLandscape.matches
      ? Math.min(1.25, (innerWidth - 100) / group.offsetWidth)
      : (innerWidth - 40) / group.offsetWidth;
    group.style.setProperty('--timeline-mobile-scale', scale);
    controls.style.setProperty('--timeline-mobile-height', `${group.offsetHeight * scale}px`);
  } else {
    group.style.removeProperty('--timeline-mobile-scale');
    controls?.style.removeProperty('--timeline-mobile-height');
  }
  group.style.setProperty('--timeline-pill-x', `${active.offsetLeft}px`);
  group.style.setProperty('--timeline-pill-width', `${active.offsetWidth}px`);
  group.classList.add('has-measured-pill');
}

function schedulePill() {
  if (!pendingPill) pendingPill = requestAnimationFrame(updatePill);
}

if (root) {
  new MutationObserver(() => { scheduleRail(); schedulePill(); }).observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  const holdManualRail = event => {
    if (event.target.closest?.('.timeline-year-rail')) manualRailUntil = performance.now() + 2500;
  };
  root.addEventListener('wheel', holdManualRail, { capture: true, passive: true });
  root.addEventListener('touchstart', holdManualRail, { capture: true, passive: true });
  root.addEventListener('touchmove', holdManualRail, { capture: true, passive: true });
  root.addEventListener('click', event => {
    if (event.target.closest?.('.section-5 .timeline-groups button')) manualRailUntil = 0;
  }, true);
  root.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) holdManualRail(event);
  }, true);
  root.addEventListener('scroll', event => {
    if (!event.target.closest?.('.timeline-year-rail')) scheduleRail();
  }, true);
}
mobile.addEventListener('change', scheduleRail);
mobile.addEventListener('change', schedulePill);
mobilePortrait.addEventListener('change', scheduleRail);
mobileLandscape.addEventListener('change', schedulePill);
addEventListener('resize', () => { scheduleRail(); schedulePill(); });
document.fonts?.ready.then(() => { scheduleRail(); schedulePill(); });
scheduleRail();
schedulePill();
