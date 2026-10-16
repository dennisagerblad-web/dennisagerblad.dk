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
  const shows = timelineEntries.filter(e => /juleshow/i.test(e.title));
  assert.equal(shows.length,new Set(shows.map(e=>e.date.slice(0,4))).size,'One Christmas show per year');
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
  for(const [name,count] of [['Dennis Agerblad',3],['Alexis',1],['Miss Fish',1],['Hairwerk',2],['Andreas Tange Lange',2]]) assert.equal(match(result,parse(name)).matchedImages.length,count,name+' has no unrelated batch photos');
  assert.equal(match(result,parse('Andreas Tange Lange røv')).matchedImages[0].src,batch.photos[6].src);
  assert.equal(match(result,parse('Dennis Agerblad røv')),null,'Anatomy remains attached to the confirmed person');
  console.log('PASS: one Christmas show per year, all merged media and old links preserved; ten photos with aligned bilingual descriptions, previews, geometry and exact owner-confirmed people searches');
})().catch(e=>{console.error(e);process.exitCode=1});
