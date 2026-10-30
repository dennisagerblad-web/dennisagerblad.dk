const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/section-routes.js'), 'utf8');
const entries = ['', 'tidslinje', 'performance', 'kunst', 'litteratur', 'musik', 'video'];

// A first visit through the homepage must resolve the same assets as a direct
// visit to a section; pushState must not move relative URLs into /section/assets/.
for (const section of entries) {
  const html = fs.readFileSync(path.join(root, section, 'index.html'), 'utf8');
  assert.match(html, /<base\s+href="\/">/, `${section || 'homepage'} needs a stable asset base`);
}

function documentWithBase(initialBase) {
  let base = initialBase;
  let inserted = 0;
  const location = { href: 'https://dennisagerblad.dk/?lang=da' };
  const document = {
    querySelector(selector) { return selector === 'base[href]' ? base : null; },
    getElementById() { return null; },
    createElement(tag) {
      assert.equal(tag, 'base');
      return { setAttribute(name, value) { this[name] = value; } };
    },
    head: { prepend(element) { base = element; inserted++; } },
    get baseURI() { return new URL(base?.href || location.href, location.href).href; },
  };
  return { document, location, base: () => base, inserted: () => inserted };
}

// Older cached homepage HTML has no base tag. The route script must establish it
// before navigation, without depending on the image watchdog's full-page reload.
const cached = documentWithBase(null);
vm.runInNewContext(source, { document: cached.document });
assert.equal(cached.inserted(), 1);
assert.equal(cached.base().href, '/');
for (const section of entries) {
  cached.location.href = `https://dennisagerblad.dk/${section ? section + '/' : ''}?lang=da`;
  assert.equal(new URL('./assets/timeline-thumbs/example.webp', cached.document.baseURI).pathname,
    '/assets/timeline-thumbs/example.webp');
  assert.equal(new URL('./assets/art-cat-updated.webp', cached.document.baseURI).pathname,
    '/assets/art-cat-updated.webp');
}

vm.runInNewContext(source, { document: cached.document });
assert.equal(cached.inserted(), 1, 'reinstalling routes must not add another base');
const existing = { href: '/' };
const direct = documentWithBase(existing);
vm.runInNewContext(source, { document: direct.document });
assert.equal(direct.inserted(), 0);
assert.equal(direct.base(), existing, 'direct section visits keep their existing base');
console.log('Section asset base: homepage, cached HTML and all six section routes passed.');
