// Run from any directory with Node: node tools/i18n/check-language-default.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../assets/site-language-default.js'), 'utf8');

function visit({ country = 'US', url = 'https://dennisagerblad.dk/', stored,
  blockedStorage = false, pending = false, fail = false, status = 200 } = {}) {
  const values = new Map(stored ? [['dennis-language', stored]] : []);
  let requests = 0;
  let reply;
  const window = {};
  const document = { documentElement: {} };
  const fetch = (_, { signal }) => {
    requests++;
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
      reply = () => fail ? reject(new Error('offline')) : resolve({
        ok: status === 200,
        text: async () => `unrelated=value\nloc=${country}\nother=value\n`
      });
      if (!pending) reply();
    });
  };
  const localStorage = {
    getItem(key) { if (blockedStorage) throw new Error('blocked'); return values.get(key) || null; },
    setItem(key, value) { if (blockedStorage) throw new Error('blocked'); values.set(key, value); }
  };
  vm.runInNewContext(source, {
    window, document, location: new URL(url), localStorage, fetch,
    URL, AbortController, setTimeout, clearTimeout
  });
  return { policy: window.DennisLanguageDefault, document, values,
    reply: () => reply(), get requests() { return requests; } };
}

(async () => {
  for (const country of ['DK', 'FO', 'GL', 'NO', 'SE']) {
    const visitor = visit({ country });
    assert.equal(await visitor.policy.ready, 'da', `${country}: Danish default`);
    assert.equal(visitor.values.has('dennis-language'), false, 'Automatic detection is not a saved choice');
  }
  for (const country of ['US', 'GB', 'DE', 'FI', 'IS', 'AU', 'JP', 'BR', 'XX', '']) {
    assert.equal(await visit({ country }).policy.ready, 'en', `${country}: English default`);
  }
  for (const [url, stored, expected] of [
    ['https://dennisagerblad.dk/?lang=en', 'da', 'en'],
    ['https://dennisagerblad.dk/?lang=da', 'en', 'da'],
    ['https://dennisagerblad.dk/', 'en', 'en'],
    ['https://dennisagerblad.dk/', 'da', 'da']
  ]) {
    const visitor = visit({ url, stored, country: 'US' });
    assert.equal(await visitor.policy.ready, expected, 'Link / saved choice has priority');
    assert.equal(visitor.requests, 0, 'A known choice does not need a country lookup');
  }
  for (const country of ['DK', 'US']) {
    const visitor = visit({ country, pending: true });
    const chosen = country === 'DK' ? 'en' : 'da';
    visitor.policy.choose(chosen);
    visitor.reply();
    assert.equal(await visitor.policy.ready, chosen, 'A slow lookup cannot undo a manual choice');
    assert.equal(visitor.values.get('dennis-language'), chosen, 'Remember the manual choice');
  }
  for (const settings of [{ fail: true }, { status: 503 }, { country: 'malformed' }]) {
    assert.equal(await visit(settings).policy.ready, 'en', 'Unavailable country falls back to English');
  }
  const blocked = visit({ country: 'FO', blockedStorage: true });
  assert.equal(await blocked.policy.ready, 'da', 'Country detection works without storage');
  assert.doesNotThrow(() => blocked.policy.choose('en'));
  assert.equal(blocked.policy.current, 'en');
  assert.equal(await visit({ pending: true }).policy.ready, 'en', 'A hung lookup times out');
  const offlineFile = visit({ url: 'file:///preview/index.html' });
  assert.equal(await offlineFile.policy.ready, 'en');
  assert.equal(offlineFile.requests, 0);
  console.log('PASS: country defaults, explicit links, remembered choices, late responses, storage errors and network failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
