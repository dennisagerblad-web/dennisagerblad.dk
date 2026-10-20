const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
(async()=>{
  const read=path=>JSON.parse(fs.readFileSync(path));
  const {timelineEntries}=await import('../content/timeline/entries.js');
  const {normalizeTimelineSearch:normalize,parseTimelineSearchQuery:parse,matchTimelineResult:match}=await import('../assets/timeline-search-match.js');
  const batch=read('docs/scoop-models-photo-batch-20261020.json');
  const entry=timelineEntries.find(e=>e.date==='2022-12-17');
  assert.equal(timelineEntries.filter(e=>e.date==='2022-12-17').length,1,'Add photos to the existing event');
  const key=[entry.date,entry.category,entry.title].join('|');
  const gallery=read('content/timeline/galleries.json').entries[key];
  const people=read('content/timeline/people.json').photos;
  const metadata=read('content/timeline/image-metadata.json').media;
  const previews=read('content/timeline/search-thumbnails.json').thumbnails;
  const language=fs.readFileSync('assets/site-language-data.js','utf8');
  const english=JSON.parse(language.slice(language.indexOf('{'),language.lastIndexOf('}')+1));
  assert.equal(gallery.images.length,6);assert.equal(new Set(gallery.images).size,6);
  assert.deepEqual(entry.images,gallery.images);
  assert.equal(entry.thumbnail,batch.photos[2].src,'The solo portrait is the event thumbnail');
  assert.ok(fs.existsSync(entry.thumbnailPreview));
  assert.ok(batch.photos.reduce((n,p)=>n+p.webBytes,0)<batch.photos.reduce((n,p)=>n+p.originalBytes,0),'Web copies are compressed');
  for(const [i,photo] of batch.photos.entries()){
    assert.equal(createHash('sha256').update(fs.readFileSync(photo.source)).digest('hex'),photo.sha256Original,'Source original remains unchanged');
    assert.ok(fs.existsSync(photo.src));assert.ok(fs.existsSync(previews[photo.src]));
    assert.equal(metadata[photo.src].width,1440);assert.equal(metadata[photo.src].height,1440);
    assert.equal(gallery.imageDescriptions[i],photo.description);
    assert.equal(english[photo.description],photo.english);
    assert.deepEqual(people[photo.src].people,photo.confirmedPeople);
    assert.ok(!/Glemt person|Ikke søgbare mennesker|Kunst/.test(photo.confirmedNames.join(' ')),'Private labels are not published');
  }
  const result={entry,searchable:normalize(entry.title),images:gallery.images.map((src,i)=>({src,description:gallery.imageDescriptions[i],people:people[src].people}))};
  for(const [name,count] of [['Dennis Agerblad',4],['Hairwerk',2],['Adam',2]])assert.equal(match(result,parse(name))?.matchedImages.length,count,'Owner-confirmed photo search: '+name);
  console.log('PASS: six optimized Scoop Models photos, original files preserved, bilingual descriptions and exact confirmed person searches');
})().catch(error=>{console.error(error);process.exitCode=1});
