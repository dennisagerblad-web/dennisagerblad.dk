// Only a visitor's own choice is saved. Country detection stays on this origin
// and uses Cloudflare, which already handles the website's traffic.
(() => {
  const valid = value => value === 'da' || value === 'en';
  const danishCountries = new Set(['DK', 'FO', 'GL', 'NO', 'SE']);
  let preferred = new URL(location.href).searchParams.get('lang');
  if (!valid(preferred)) {
    try { preferred = localStorage.getItem('dennis-language'); } catch {}
  }
  if (!valid(preferred)) preferred = null;
  let current = preferred || 'en';
  const defaults = {
    get current() { return current; },
    choose(language) {
      if (!valid(language)) return;
      preferred = current = language;
      try { localStorage.setItem('dennis-language', language); } catch {}
    },
    ready: Promise.resolve(current)
  };
  window.DennisLanguageDefault = defaults;
  document.documentElement.lang = current;
  if (preferred || !/^https?:$/.test(location.protocol)) return;

  // Start before the main application downloads. A failed lookup never blocks
  // the page, and an explicit choice made while it is pending always wins.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  defaults.ready = fetch('/cdn-cgi/trace', {
    credentials: 'omit', cache: 'no-store', signal: controller.signal
  }).then(response => {
    if (!response.ok) throw new Error('Country lookup unavailable');
    return response.text();
  }).then(trace => {
    const country = /^loc=([A-Z]{2})\r?$/m.exec(trace)?.[1];
    if (!preferred) current = danishCountries.has(country) ? 'da' : 'en';
    document.documentElement.lang = current;
    return current;
  }).catch(() => current).finally(() => clearTimeout(timeout));
})();
