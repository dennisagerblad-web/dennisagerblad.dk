const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
(async () => {
  const {timelineEntries} = await import('../content/timeline/entries.js');
  const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize} = await import('../assets/timeline-search-match.js');
  const read = p => JSON.parse(fs.readFileSync(p));
  const galleries = read('content/timeline/galleries.json').entries;
  const before = JSON.parse(execFileSync('git',['show','0512c19:content/timeline/galleries.json'],{maxBuffer:10e6})).entries;
  const report = read('docs/timeline-christmas-consolidation-20261016.json');
  const restored = report.restoredSeparateEvents;
  assert.ok(!timelineEntries.some(e=>[e.date,e.category,e.title].join('|')===restored.previousMergedKey),'Distinct 2024 events are not merged');
  for (const {key,images} of restored.events) {
    const entry=timelineEntries.find(e=>[e.date,e.category,e.title].join('|')===key);
    assert.ok(entry,key);
    assert.equal(galleries[key].images.length,images,'Each event has its own complete gallery');
    assert.deepEqual(galleries[key].images,before[key].images,'Preserve original event photo order');
    assert.deepEqual(entry.images,galleries[key].images,'Timeline and popup use the same event photographs');
    assert.equal(galleries[key].imageDescriptions.length,images,'Preserve every photo description');
    assert.ok(galleries[key].images.every(src=>src.includes('/'+entry.date+'-')),'No photos from the other show');
    assert.ok(fs.existsSync(entry.thumbnail));assert.ok(fs.existsSync(entry.thumbnailPreview));
    for (const other of restored.events.filter(event=>event.key!==key)) assert.ok(!entry.shareAliases?.includes(other.key),'Original links retain the correct event');
  }
  const christmas2024=timelineEntries.find(e=>e.date==='2024-12-21');
  assert.ok(christmas2024.shareAliases.includes(restored.previousMergedKey),'The previously shared merged URL still resolves');
  for (const group of report.groups) {
    const entry = timelineEntries.find(e=>[e.date,e.category,e.title].join('|')===group.newKey);
    assert.ok(entry,group.newKey);
    const kept = new Set(galleries[group.newKey]?.images || []);
    for (const key of group.sourceEntries) {
      for (const src of before[key]?.images || []) assert.ok(kept.has(src),'Preserve Christmas photograph: '+src);
      if (key!==group.newKey) assert.ok(entry.shareAliases.includes(key),'Preserve old shared link: '+key);
    }
  }
  const batch=read('docs/timeline-broken-mirror-2007-20261016.json');
  const people=read('content/timeline/people.json').photos;
  const looks=read('content/timeline/own-look-features.json').photos;
  const anatomy=read('content/timeline/body-features.json').photos;
  const previews=read('content/timeline/search-thumbnails.json').thumbnails;
  const metadata=read('content/timeline/image-metadata.json').media;
  const gallery=galleries['2007-12-15|Liveoptræden|Udgivelsesfest for Broken Mirror Records, Warehouse 9, København.'];
  assert.equal(batch.photos.length,10);assert.equal(gallery.images.length,11,'Ten photographs and the original flyer');
  const langSource=fs.readFileSync('assets/site-language-data.js','utf8');
  const lang=JSON.parse(langSource.slice(langSource.indexOf('{'),langSource.lastIndexOf('}')+1));
  const result={entry:{date:'2007-12-15',title:gallery.title},searchable:normalize(gallery.title),images:gallery.images.map((src,i)=>({src,description:gallery.imageDescriptions[i],people:people[src.split('?')[0]]?.people || [],look:looks[src.split('?')[0]],anatomy:anatomy[src.split('?')[0]]}))};
  for(const photo of batch.photos) {
    const canonical=photo.src.split('?')[0];
    assert.ok(fs.existsSync(canonical));assert.ok(fs.existsSync(previews[photo.src]));
    assert.ok(metadata[photo.src] || metadata[canonical]);
    assert.equal(gallery.imageDescriptions[gallery.images.indexOf(photo.src)],photo.descriptionDA);
    assert.equal(lang[photo.descriptionDA],photo.descriptionEN);
    assert.ok(looks[canonical].reviewed);
    for(const name of photo.confirmedNames) {
      assert.ok(photo.descriptionDA.includes(name));assert.ok(photo.descriptionEN.includes(name));
      assert.ok(match(result,parse(name))?.matchedImages.some(p=>p.src===photo.src),'Name finds its confirmed photo: '+name);
    }
  }
  for(const [name,count] of [['Nat Zyrik',1],['Dennis Agerblad',3],['Alexis',1],['Miss Fish',1],['Hairwerk',2],['Andreas Tange Lange',2]]) assert.equal(match(result,parse(name)).matchedImages.length,count,name+' has no unrelated batch photos');
  assert.equal(match(result,parse('Andreas Tange Lange røv')).matchedImages[0].src,batch.photos[6].src);
  assert.equal(match(result,parse('Dennis Agerblad røv')),null,'Anatomy remains attached to the confirmed person');
  console.log('PASS: separate 2024 Christmas events with original dates, photo sets, thumbnails and links; other Christmas media and Broken Mirror photo metadata preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
