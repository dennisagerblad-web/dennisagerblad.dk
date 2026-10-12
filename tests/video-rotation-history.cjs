// Start an HTTP server in this checkout. VIDEO_URL may point to the live site.
// Test native frame history in WebKit as well as Chromium; Chromium alone misses
// WebKit turning a changed iframe src into a top-level Back-button destination.
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const base = process.env.VIDEO_URL || 'http://127.0.0.1:8824/';
const stubAPI = `window.YT={Player:function(frame,options){let state=-1;
 this.getPlayerState=()=>state;
 this.playVideo=()=>{state=1;options.events.onStateChange?.({data:state})};
 this.pauseVideo=()=>{state=2;options.events.onStateChange?.({data:state})};
 setTimeout(()=>options.events.onReady?.(),0);
}};window.onYouTubeIframeAPIReady?.();`;
(async () => {
  for (const scenario of [
    { engine: webkit, name: 'webkit-portrait', width: 390, height: 844, language: 'da' },
    { engine: webkit, name: 'webkit-wide-iphone', width: 430, height: 932, language: 'en' },
    { engine: chromium, name: 'chromium-desktop', width: 1365, height: 900, language: 'da' },
  ]) {
    const mobile = scenario.engine === webkit;
    const browser = await scenario.engine.launch(mobile ? { headless: true } : {
      headless: true, executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
    try {
      const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height },
        isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // Keep the regression deterministic; the actual frame navigations, shared
      // history, rotation, layout, language code and site controls remain real.
      await page.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({
        contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width"><title>Embedded video</title>',
      }));
      await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'text/javascript', body: stubAPI }));
      const sentinel = new URL('__video-history-test', base).href;
      const target = new URL(base); if (scenario.language === 'en') target.searchParams.set('lang', 'en');
      await page.route(sentinel, route => route.fulfill({ contentType: 'text/html', body: `<a href="${target.href}">Open website</a>` }));
      await page.goto(sentinel); await page.locator('a').click();
      const baselineHistory = await page.evaluate(() => history.length);
      await page.locator('.face-menu .menu-1').click();
      await page.locator('.ship.section-1.is-open .video-grid').waitFor();
      await page.waitForTimeout(800);
      const historyLength = await page.evaluate(() => history.length);
      // Only the preceding page and website belong in history; no video URLs.
      assert.equal(historyLength, baselineHistory, scenario.name + ': iframe history entries');
      await page.evaluate(() => { window.firstVideo = document.querySelector('.video-grid iframe'); window.initialVideoSource = firstVideo.src; });
      const checkSize = async () => {
        const metrics = await page.evaluate(() => {
          const frame = document.querySelector('.video-grid iframe'), box = frame.getBoundingClientRect();
          return { same: frame === window.firstVideo, src: frame.src, w: box.width, h: box.height, viewport: innerWidth, scale: visualViewport.scale, history: history.length };
        });
        assert.equal(metrics.same, true); assert.equal(metrics.history, historyLength);
        assert(metrics.w <= metrics.viewport); assert(Math.abs(metrics.w / metrics.h - 16 / 9) < .02);
        assert.equal(metrics.scale, 1);
      };
      await checkSize();
      for (let rotation = 0; rotation < 3; rotation++) {
        await page.setViewportSize({ width: scenario.height, height: scenario.width }); await checkSize();
        await page.setViewportSize({ width: scenario.width, height: scenario.height }); await checkSize();
      }
      for (const language of ['en', 'da', 'en', 'da']) {
        await page.locator(`[data-language="${language}"]`).evaluate(button => button.click());
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => history.length), historyLength, 'Language switch added history');
        assert(page.frames().some(frame => new URL(frame.url()).hostname === 'www.youtube-nocookie.com'
          && new URL(frame.url()).searchParams.get('hl') === language), 'Player language did not change');
      }
      // The accessible play/pause control must still work after rotations.
      const control = page.locator('.video-frame .aa-video-entry').first();
      await control.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.video-frame').dataset.playback === '1');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.video-frame').dataset.playback === '2');
      await checkSize();
      assert.equal(await page.evaluate(() => firstVideo.src === initialVideoSource), true, 'Connected iframe src was rewritten');
      if (mobile) await page.locator('.panel-0').click();
      else { await page.locator('.panel-0').focus(); await page.keyboard.press('Enter'); }
      await page.waitForFunction(() => !document.querySelector('.ship').classList.contains('has-section'));
      await page.locator('.face-menu .menu-1').click(); await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => history.length), historyLength, 'Reopening Video added history');
      await page.goBack(); assert.equal(page.url(), sentinel, 'Back did not exit in one step');
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ scenario: scenario.name, historyLength, rotations: 3, languageChanges: 4, back: 'one step', errors }));
    } finally { await browser.close(); }
  }
  console.log('PASS: WebKit and Chromium rotation, sizing, frame identity, language, play/pause, reopen and one-step Back');
})().catch(error => { console.error(error); process.exitCode = 1; });
