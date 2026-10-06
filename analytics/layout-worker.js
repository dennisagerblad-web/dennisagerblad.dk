const text = (value, status = 200, headers = {}) => new Response(status === 204 ? null : value, {
  status, headers: {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers},
});
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
})[character]);

function sameOrigin(request) {
  const expected = new URL(request.url).origin;
  const source = request.headers.get('Origin') || request.headers.get('Referer');
  if (!source) return false;
  try { return new URL(source).origin === expected; } catch { return false; }
}

function validDimension(value) {
  return Number.isInteger(value) && value >= 20 && value <= 10000 && value % 20 === 0;
}

function validObservation(value) {
  return value && typeof value === 'object' &&
    ['load','change'].includes(value.kind) &&
    ['desktop','mobile','tablet'].includes(value.device) &&
    ['portrait','landscape'].includes(value.orientation) &&
    ['portrait','landscape'].includes(value.viewportOrientation) &&
    ['viewportWidth','viewportHeight','screenWidth','screenHeight'].every(key => validDimension(value[key]));
}

function validEvent(value) {
  if (!value || typeof value !== 'object' ||
      !['page_view','section','timeline_tab','year_reached','popup'].includes(value.kind) ||
      typeof value.label !== 'string' || !value.label || value.label.length > 160) return false;
  if (value.kind === 'year_reached' && !/^\d{4}$/.test(value.label)) return false;
  if (value.kind === 'page_view' && !/^\/[\w./%-]*$/.test(value.label)) return false;
  if (value.kind === 'popup' && !/^\d{4}-\d{2}-\d{2}$/.test(value.date || '')) return false;
  return value.tab === undefined || (typeof value.tab === 'string' && value.tab.length <= 30);
}

async function collect(request, env) {
  if (request.method !== 'POST') return text('Method not allowed', 405, {'Allow':'POST'});
  if (!sameOrigin(request)) return text('Forbidden', 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return text('Invalid type', 415);
  if (Number(request.headers.get('Content-Length') || 0) > 1024) return text('Too large', 413);
  let value;
  try {
    const body = await request.text();
    if (body.length > 1024) return text('Too large', 413);
    value = JSON.parse(body);
  } catch { return text('Invalid JSON', 400); }
  if (!validObservation(value) && !validEvent(value)) return text('Invalid observation', 400);
  const country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : 'XX';
  if (validEvent(value)) {
    await env.DB.prepare(`INSERT INTO site_events
      (created_at, kind, label, tab, event_date, country) VALUES (?, ?, ?, ?, ?, ?)`).bind(
        Math.floor(Date.now() / 1000), value.kind, value.label,
        value.tab || '', value.date || '', country,
      ).run();
    return text('', 204);
  }
  await env.DB.prepare(`INSERT INTO layout_observations
    (created_at, kind, device, viewport_width, viewport_height, screen_width, screen_height,
     orientation, viewport_orientation, country)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      Math.floor(Date.now() / 1000), value.kind, value.device,
      value.viewportWidth, value.viewportHeight, value.screenWidth, value.screenHeight,
      value.orientation, value.viewportOrientation, country,
    ).run();
  return text('', 204);
}

function equalSecret(actual, expected) {
  if (!expected || typeof actual !== 'string') return false;
  let mismatch = actual.length ^ expected.length;
  for (let index = 0; index < Math.max(actual.length, expected.length); index++) {
    mismatch |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function authorized(request, env) {
  const value = request.headers.get('Authorization') || '';
  if (!value.startsWith('Basic ')) return false;
  try {
    const credentials = atob(value.slice(6));
    const separator = credentials.indexOf(':');
    return separator >= 0 && credentials.slice(0, separator) === 'dennis' &&
      equalSecret(credentials.slice(separator + 1), env.REPORT_PASSWORD);
  } catch { return false; }
}

function table(title, headers, rows, format = row => row) {
  const head = headers.map(header => `<th>${escapeHtml(header)}</th>`).join('');
  const body = rows.map(row => `<tr>${format(row).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  return `<section><h2>${escapeHtml(title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">Ingen målinger endnu</td></tr>`}</tbody></table></section>`;
}

async function report(request, env) {
  if (!env.REPORT_PASSWORD) return text('Report password missing', 503);
  if (!authorized(request, env)) return text('Login required', 401, {
    'WWW-Authenticate':'Basic realm="Dennis Agerblad statistik", charset="UTF-8"',
  });
  const url = new URL(request.url);
  const days = [7,30,90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const query = async sql => (await env.DB.prepare(sql).bind(since).all()).results || [];
  const [devices, orientations, viewports, screens, windows, countries, changes,
    pages, sections, tabs, years, popups] = await Promise.all([
    query(`SELECT device, COUNT(*) AS count FROM layout_observations WHERE kind='load' AND created_at>=? GROUP BY device ORDER BY count DESC`),
    query(`SELECT device, orientation, COUNT(*) AS count FROM layout_observations WHERE kind='load' AND created_at>=? GROUP BY device,orientation ORDER BY device,count DESC`),
    query(`SELECT device, viewport_width, viewport_height, COUNT(*) AS count FROM layout_observations WHERE kind='load' AND created_at>=? GROUP BY device,viewport_width,viewport_height ORDER BY count DESC LIMIT 30`),
    query(`SELECT device, screen_width, screen_height, COUNT(*) AS count FROM layout_observations WHERE kind='load' AND created_at>=? GROUP BY device,screen_width,screen_height ORDER BY count DESC LIMIT 30`),
    query(`SELECT CASE WHEN viewport_width * 100 >= screen_width * 90 THEN '90–100 %' WHEN viewport_width * 100 >= screen_width * 60 THEN '60–89 %' ELSE 'Under 60 %' END AS width_share, COUNT(*) AS count FROM layout_observations WHERE kind='load' AND device='desktop' AND created_at>=? GROUP BY width_share ORDER BY count DESC`),
    query(`SELECT country, COUNT(*) AS count FROM layout_observations WHERE kind='load' AND created_at>=? GROUP BY country ORDER BY count DESC LIMIT 20`),
    query(`SELECT device, COUNT(*) AS count FROM layout_observations WHERE kind='change' AND created_at>=? GROUP BY device ORDER BY count DESC`),
    query(`SELECT label, COUNT(*) AS count FROM site_events WHERE kind='page_view' AND created_at>=? GROUP BY label ORDER BY count DESC`),
    query(`SELECT label, COUNT(*) AS count FROM site_events WHERE kind='section' AND created_at>=? GROUP BY label ORDER BY count DESC`),
    query(`SELECT label, COUNT(*) AS count FROM site_events WHERE kind='timeline_tab' AND created_at>=? GROUP BY label ORDER BY count DESC`),
    query(`SELECT tab, label, COUNT(*) AS count FROM site_events WHERE kind='year_reached' AND created_at>=? GROUP BY tab,label ORDER BY tab,label DESC`),
    query(`SELECT event_date, label, tab, COUNT(*) AS count FROM site_events WHERE kind='popup' AND created_at>=? GROUP BY event_date,label,tab ORDER BY count DESC, event_date DESC`),
  ]);
  const total = devices.reduce((sum, row) => sum + row.count, 0);
  const countryName = code => {
    try { return new Intl.DisplayNames(['da'], {type:'region'}).of(code) || code; }
    catch { return code; }
  };
  const html = `<!doctype html><html lang="da"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Besøgsstatistik — Dennis Agerblad</title>
<style>body{font:16px/1.45 system-ui,sans-serif;max-width:1100px;margin:32px auto;padding:0 20px;color:#202020}h1{font-size:2rem}nav a{margin-right:16px}section{margin:32px 0;overflow:auto}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #ddd}th{background:#f2f2f2}small{color:#555}</style>
<h1>Besøgsstatistik</h1><nav><a href="?days=7">7 dage</a><a href="?days=30">30 dage</a><a href="?days=90">90 dage</a></nav>
<p>${escapeHtml(days)} dage · ${escapeHtml(total)} sideåbninger målt på den nye hjemmeside</p>
${table('Enheder',['Enhed','Sideåbninger'],devices,row=>[row.device,row.count])}
${table('Skærmretning',['Enhed','Retning','Sideåbninger'],orientations,row=>[row.device,row.orientation,row.count])}
${table('Synlige browserstørrelser, CSS-pixels',['Enhed','Bredde','Højde','Sideåbninger'],viewports,row=>[row.device,row.viewport_width,row.viewport_height,row.count])}
${table('Skærmstørrelser, CSS-pixels',['Enhed','Bredde','Højde','Sideåbninger'],screens,row=>[row.device,row.screen_width,row.screen_height,row.count])}
${table('Desktopvinduets bredde i forhold til skærmen',['Andel af skærmbredden','Sideåbninger'],windows,row=>[row.width_share,row.count])}
${table('Lande',['Land','Sideåbninger'],countries,row=>[countryName(row.country),row.count])}
${table('Ændret størrelse eller retning',['Enhed','Registrerede ændringer'],changes,row=>[row.device,row.count])}
${table('Besøgte adresser',['Adresse','Sideåbninger'],pages,row=>[row.label,row.count])}
${table('Åbnede menupunkter',['Menupunkt','Åbninger'],sections,row=>[row.label,row.count])}
${table('Klik på tidslinjens faner',['Fane','Klik'],tabs,row=>[row.label,row.count])}
${table('Årstal nået ved scroll',['Fane','År','Sidevisninger, der nåede året'],years,row=>[row.tab,row.label,row.count])}
${table('Åbnede tidslinjevinduer',['Dato','Titel','Fane','Åbninger'],popups,row=>[row.event_date,row.label,row.tab,row.count])}
<small>Mål er afrundet til nærmeste 20 CSS-pixels. Et bredt vindue er ikke nødvendigvis fuldskærm. Besøgende med Do Not Track eller Global Privacy Control tælles ikke her. Ingen navne, IP-adresser, cookies eller varige bruger-id'er gemmes.</small></html>`;
  return text(html, 200, {'Content-Type':'text/html; charset=utf-8',
    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"});
}

export default {
  async fetch(request, env) {
    if (!env.DB) return text('Database missing', 503);
    const path = new URL(request.url).pathname;
    if (path === '/_stats/collect') return collect(request, env);
    if (path === '/_stats/report' && request.method === 'GET') return report(request, env);
    return text('Not found', 404);
  },
};
