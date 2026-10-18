const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const {thumbnailFirst}=await import('../assets/timeline-gallery.js');
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 let checked=0;
 for(const entry of timelineEntries){
  const g=galleries[[entry.date,entry.category,entry.title].join('|')];if(!g?.images.length)continue;
  const before=[...g.images],descriptions=g.imageDescriptions||[];
  const result=thumbnailFirst(g.images,descriptions,entry.thumbnail);
  assert.deepEqual(g.images,before,'Does not mutate shared search data');
  if(entry.thumbnail&&g.images.includes(entry.thumbnail)){assert.equal(result.images[0],entry.thumbnail);checked++;}
  for(let i=0;i<result.images.length;i++)assert.equal(result.descriptions[i],descriptions[g.images.indexOf(result.images[i])],'Description stays with the same image');
 }
 assert.deepEqual(thumbnailFirst(['./a.jpg','./b.jpg?v=1'],['A','B'],'./b.jpg?v=2'),{images:['./b.jpg?v=1','./a.jpg'],descriptions:['B','A']});
 const entry=timelineEntries.find(e=>e.date==='2012-06-22'),g=galleries[[entry.date,entry.category,entry.title].join('|')];assert.equal(g.images[0],entry.thumbnail,'Zentropa data also starts with its thumbnail');
 console.log(`PASS: ${checked} thumbnail-first gallery openings; descriptions follow their photos, cache queries are ignored, shared search data stays unchanged.`);
})().catch(e=>{console.error(e);process.exitCode=1});
