const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

// Smoke-test the published entry point, small previews and full-size galleries.
(async () => {
  const base = process.env.SITE_URL || 'http://127.0.0.1:8765';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [name, viewport] of Object.entries({
      desktop: { width: 1440, height: 900 },
      portrait: { width: 390, height: 844 },
      landscape: { width: 844, height: 390 },
    })) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.url().startsWith(base) && response.status() >= 400) {
          errors.push(`${response.status()} ${response.url()}`);
        }
      });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Tidslinje', exact: true }).click();
      const thumbnails = page.locator('.timeline-thumbnail');
      assert((await thumbnails.count()) > 100);
      assert.match(await thumbnails.first().getAttribute('src'), /assets\/timeline-thumbs\/.+\.webp$/);
      await page.waitForFunction(() => [...document.querySelectorAll('.timeline-thumbnail')]
        .every(image => image.complete && image.naturalWidth > 0));
      await page.locator('.timeline-entry').filter({ hasText: 'Udgivelseskoncert for albummet' }).click();
      await page.locator('.tg-stage[data-index="0"]').waitFor();
      await page.getByRole('button', { name: 'Næste billede' }).click();
      await page.locator('.tg-stage[data-index="1"]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.timeline-groups').getByRole('button', { name: 'Kunst', exact: true }).click();
      assert((await page.locator('.timeline-thumbnail').count()) > 10);
      await page.waitForFunction(() => [...document.querySelectorAll('.timeline-thumbnail')]
        .every(image => image.complete && image.naturalWidth > 0));
      await page.locator('.timeline-groups').getByRole('button', { name: 'Presse', exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('.timeline-thumbnail')]
        .every(image => image.complete && image.naturalWidth > 0));
      assert.deepEqual(errors, [], `${name} browser errors`);
      console.log(`${name}: previews, gallery, categories and asset requests PASS`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
