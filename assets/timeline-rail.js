// Show the mobile year list with the timeline, after the introduction bubble.
const root = document.getElementById('root');
const mobile = matchMedia('(max-width: 760px)');
const mobileLandscape = matchMedia('(max-width: 1100px) and (max-height: 650px) and (orientation: landscape)');
let pending = 0;
let pendingPill = 0;

function updateRail() {
  pending = 0;
  const rail = document.querySelector('.timeline-year-rail');
  const firstYear = root?.querySelector('.section-5 .life-year');
  if (!rail || !firstYear) return;
  if (mobile.matches) {
    const stickyTop = Math.min(135, Math.max(105, innerHeight * .15));
    const firstCardTop = firstYear.getBoundingClientRect().top;
    rail.style.setProperty('--timeline-rail-top', `${Math.max(stickyTop, firstCardTop)}px`);
  } else {
    rail.style.removeProperty('--timeline-rail-top');
  }
  rail.classList.add('is-with-timeline');
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
  root.addEventListener('scroll', scheduleRail, true);
}
mobile.addEventListener('change', scheduleRail);
mobile.addEventListener('change', schedulePill);
mobileLandscape.addEventListener('change', schedulePill);
addEventListener('resize', () => { scheduleRail(); schedulePill(); });
document.fonts?.ready.then(() => { scheduleRail(); schedulePill(); });
scheduleRail();
schedulePill();
