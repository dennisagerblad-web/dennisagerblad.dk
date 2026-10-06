// Measurements for the new site only. No cookies, persistent IDs, or IP addresses.
const endpoint = '/_stats/collect';
const round20 = value => Math.round(value / 20) * 20;

function deviceType() {
  const agent = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Kindle|Silk/i.test(agent) ||
      (/Android/i.test(agent) && !/Mobile/i.test(agent)) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/Mobile|iPhone|iPod|Android/i.test(agent)) return 'mobile';
  return 'desktop';
}

function snapshot(kind) {
  const viewportWidth = Math.max(1, Math.round(window.innerWidth));
  const viewportHeight = Math.max(1, Math.round(window.innerHeight));
  const screenWidth = Math.max(1, Math.round(screen.width));
  const screenHeight = Math.max(1, Math.round(screen.height));
  const orientation = screen.orientation?.type?.startsWith('portrait') ? 'portrait'
    : screen.orientation?.type?.startsWith('landscape') ? 'landscape'
    : screenWidth <= screenHeight ? 'portrait' : 'landscape';
  return {
    kind,
    device: deviceType(),
    viewportWidth: round20(viewportWidth),
    viewportHeight: round20(viewportHeight),
    screenWidth: round20(screenWidth),
    screenHeight: round20(screenHeight),
    orientation,
    viewportOrientation: viewportWidth <= viewportHeight ? 'portrait' : 'landscape',
  };
}

function send(value) {
  const body = JSON.stringify(value);
  if (navigator.sendBeacon?.(endpoint, new Blob([body], {type:'application/json'}))) return;
  fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body,
    credentials:'omit', keepalive:true}).catch(() => {});
}

if (navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl) {
  let previous = snapshot('load');
  send(previous);
  send({kind:'page_view', label:location.pathname.slice(0, 160)});
  let timer;
  let changes = 0;
  function onSizeChange() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (changes >= 4) return;
      const next = snapshot('change');
      const comparable = value => `${value.viewportWidth}/${value.viewportHeight}/${value.screenWidth}/${value.screenHeight}/${value.orientation}`;
      if (comparable(next) === comparable(previous)) return;
      previous = next;
      changes++;
      send(next);
    }, 800);
  }
  window.addEventListener('resize', onSizeChange, {passive:true});
  screen.orientation?.addEventListener?.('change', onSizeChange);

  // A single delegated listener also covers controls rendered later by React.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const menu = target.closest('.face-menu .menu-point');
    if (menu) send({kind:'section', label:menu.getAttribute('aria-label') || menu.textContent.trim()});
    const tab = target.closest('.timeline-groups button');
    if (tab) send({kind:'timeline_tab', label:tab.textContent.trim()});
  }, {capture:true});

  let popupKey = '';
  let reached = new Set();
  let scrollRoot = null;
  let scrollTimer;
  function currentTab() {
    return document.querySelector('.timeline-shell')?.getAttribute('data-theme') || '';
  }
  function checkYear() {
    if (!document.querySelector('.ship.section-5.is-open')) return;
    const root = document.querySelector('.section-5 .archive-scroll');
    if (!root) return;
    const years = [...root.querySelectorAll('.life-year')];
    const line = root.getBoundingClientRect().top + Math.min(root.clientHeight * .35, 180);
    let active = years[0];
    for (const year of years) {
      if (year.getBoundingClientRect().top <= line) active = year;
      else break;
    }
    const year = active?.querySelector('h2')?.textContent.trim();
    const tab = currentTab();
    if (!/^\d{4}$/.test(year || '') || !tab) return;
    const key = `${tab}:${year}`;
    if (reached.has(key)) return;
    reached.add(key);
    send({kind:'year_reached', label:year, tab});
  }
  function checkDom() {
    const popup = document.querySelector('.timeline-overlay .timeline-popup');
    const date = popup?.querySelector('.timeline-popup-date')?.getAttribute('datetime') || '';
    const title = popup?.getAttribute('aria-label') || '';
    const key = popup ? `${date}|${title}` : '';
    if (key && key !== popupKey && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      send({kind:'popup', label:title.slice(0, 160), date, tab:currentTab()});
    }
    popupKey = key;
    const nextRoot = document.querySelector('.section-5 .archive-scroll');
    if (nextRoot !== scrollRoot) {
      scrollRoot?.removeEventListener('scroll', onTimelineScroll);
      scrollRoot = nextRoot;
      scrollRoot?.addEventListener('scroll', onTimelineScroll, {passive:true});
    }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(checkYear, 200);
  }
  function onTimelineScroll() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(checkYear, 180);
  }
  const observer = new MutationObserver(checkDom);
  observer.observe(document.body, {childList:true, subtree:true, attributes:true,
    attributeFilter:['class','data-theme','aria-label','datetime']});
  checkDom();
}
