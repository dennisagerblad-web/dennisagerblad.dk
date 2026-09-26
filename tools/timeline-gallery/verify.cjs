const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,'../../assets/timeline-gallery-data.json')));
(async()=>{
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 for (const [name,options] of Object.entries({desktop:{viewport:{width:1440,height:1000}},portrait:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},landscape:{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2}})) {
  const context=await browser.newContext(options); const page=await context.newPage();
  page.on('pageerror',e=>errors.push(name+': '+e.message));
  await page.goto('http://127.0.0.1:8765');
  await page.getByRole('button',{name:'Tidslinje',exact:true}).click(); await page.waitForTimeout(1500);
  const opener=page.locator('.timeline-entry').filter({hasText:'Fundraiser Party for LGBT+'});
  await opener.click(); await page.locator('.tg-stage[data-index="0"]').waitFor();
  assert.equal(await page.locator('.tg-dialog h2').innerText(),await opener.locator('.life-description').innerText());
  assert.equal(await page.locator('.tg-dialog svg').count(),0);
  assert.equal(await page.getByRole('button',{name:'Næste billede'}).isVisible(),false);
  const box=await page.locator('.tg-dialog').boundingBox(); assert(box.x>=0 && box.x+box.width<=options.viewport.width+1);
  await page.screenshot({path:`/tmp/timeline-${name}.png`});
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.tg-dialog').count(),0);
  assert.equal(await page.locator('.timeline-shell').isVisible(),true);
  assert(await opener.evaluate(el=>el===document.activeElement));
  // Use actual UI navigation to check independent Scene/Kunst sliders.
  await page.locator('.timeline-entry').filter({hasText:'Kønspolitisk Melodigrandprix, Bøssehuset'}).first().click();
  await page.locator('.tg-stage[data-index="0"]').waitFor();
  await page.getByRole('button',{name:'Næste billede'}).click(); await page.waitForTimeout(250);
  assert.equal(await page.locator('.tg-stage').getAttribute('data-index'),'0');
  assert.equal(await page.locator('.tg-stage').getAttribute('data-effect'),'Morph');
  if (name==='desktop') {
    assert.equal(await page.locator('.tg-effect.is-active').count(),1);
    await page.screenshot({path:'/tmp/timeline-morph-transition.png'});
  }
  await page.locator('.tg-stage[data-index="1"]').waitFor(); await page.keyboard.press('Escape');
  await page.locator('.timeline-groups').getByRole('button',{name:'Kunst',exact:true}).click();
  await page.locator('.timeline-entry').filter({hasText:'Valgplakater, Dragpartiet'}).click();
  await page.locator('.tg-stage[data-index="0"]').waitFor();
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
  assert.equal(await page.locator('.tg-stage').getAttribute('data-index'),'3');
  assert.equal(await page.locator('.tg-stage').getAttribute('data-effect'),'Paint');
  if(name==='desktop') await page.screenshot({path:'/tmp/timeline-paint-transition.png'});
  await page.waitForTimeout(1200); await page.screenshot({path:`/tmp/timeline-art-${name}.png`});
  assert.equal(await page.locator('.tg-controls,.tg-count,.tg-fit,.tg-footer').count(),0);
  assert.equal(await page.locator('.tg-stage > .tg-arrow').count(),2);
  if(name==='portrait') {
    await page.setViewportSize({width:844,height:390}); await page.waitForTimeout(150);
    assert.equal(await page.locator('.tg-stage').getAttribute('data-index'),'3');
    assert.equal(await page.getByRole('button',{name:'Fyld billedrammen',exact:true}).count(),0);
    await page.setViewportSize({width:390,height:844});
  }
  await page.keyboard.press('Escape');
  // Archive pages now use full-size images rather than their generated thumbnail.
  await page.locator('.timeline-entry').filter({hasText:'3 Selvportrætter i drag'}).first().click();
  await page.locator('.tg-stage[data-index="0"]').waitFor();
  assert.equal(await page.getByRole('link',{name:'Se det oprindelige arkiv ↗'}).count(),1);
  await page.keyboard.press('Escape');
  await page.locator('.timeline-groups').getByRole('button',{name:'Musik',exact:true}).click();
  await page.locator('.timeline-entry.has-archive').first().click();
  assert.equal(await page.locator('.tg-dialog').count(),0); assert.equal(await page.locator('.timeline-popup').count(),1);
  console.log(name,'PASS'); await context.close();
 }
 // Reduced motion, image failure, single-image media and crop geometry.
 const page=await browser.newPage({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:8765');
 const multiKey=Object.keys(manifest.entries).find(k=>k.startsWith('2023-05-27|'));
 const [date,category,title]=multiKey.split('|');
 const multi={date,category,title,display:'27.05.2023',images:manifest.entries[multiKey].images};
 await page.evaluate(async entry=>{ const m=await import('/assets/timeline-gallery.js'); m.openTimelineGallery(entry,'live'); },multi);
 await page.locator('.tg-stage[data-index="0"]').waitFor();
 await page.getByRole('button',{name:'Næste billede'}).click(); await page.waitForTimeout(150);
 assert.equal(await page.locator('.tg-effect.is-active').count(),0);
 await page.keyboard.press('Escape');
 await page.evaluate(async()=>{
  const {openTimelineGallery,cropRect}=await import('/assets/timeline-gallery.js');
  const safe=cropRect(1000,800,390,520,{faces:[[.7,.1,.13,.2]]},true);
  if(!safe || safe[0]>700 || safe[0]+safe[2]<830 || safe[1]>80 || safe[1]+safe[3]<240) throw Error('face clipped');
  const group=cropRect(1000,800,390,520,{faces:[[.05,.1,.2,.2],[.75,.1,.2,.2]]},true);
  if(!group || group[0]>50 || group[0]+group[2]<250) throw Error('main face clipped');
  openTimelineGallery({title:'Fejltest',date:'2026-09-25',display:'25.09.2026',images:['./missing-test-photo.jpg']},'live');
 });
 await page.getByRole('button',{name:'Prøv at hente billedet igen'}).waitFor();
 assert.equal(await page.locator('.tg-stage').getAttribute('data-index'),'0');
 console.log('Reduced motion / failures / face geometry PASS');
 assert.deepEqual(errors,[]); await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
