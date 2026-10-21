const fs=require('node:fs'),assert=require('node:assert/strict');
const {fileURLToPath,pathToFileURL}=require('node:url');
(async()=>{
 globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8'))});
 const {loadTimelineGalleryData,timelineEffects}=await import('../assets/timeline-gallery.js');
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const {canOpenTimelinePopup,timelinePopupParagraphs:paragraphs}=await import('../assets/timeline-popup-content.js');
 const native=JSON.parse(fs.readFileSync('content/timeline/popup-content.json'));
 const data=await loadTimelineGalleryData();
 const omitted=new Set(native.omittedLogos);
 let photos=0,press=0;
 for(const [key,gallery] of Object.entries(data.entries)){
  const entry=timelineEntries.find(e=>`${e.date}|${e.category}|${e.title}`===key);
  if(!entry)continue;
  const copy=paragraphs(entry,[...(entry.details?[entry.details]:[]),...(gallery.details||[])]);
  assert.equal(new Set(copy).size,copy.length,key+' has duplicate paragraphs');
  assert(!copy.includes(entry.title),key+' repeats its heading');
  for(const src of gallery.images || []){
   assert(fs.existsSync(fileURLToPath(new URL(src,pathToFileURL(process.cwd()+'/')))),src);
   assert(data.media[src]?.width>0&&data.media[src]?.height>0,'Missing measured image '+src);
   if(gallery.group==='press')assert(!/\/logoer\/|logo|krydd|oyggjaskeggi/i.test(src)&&!omitted.has(src),'Publisher logo in Presse: '+src);
   photos++;
  }
  if(gallery.group==='press')press++;
  for(const markup of gallery.detailMarkup || [])for(const tag of markup.match(/<[^>]+>/g)||[])assert(/^<\/?(?:strong|em)>$/.test(tag),'Old HTML/layout leaked into copy: '+tag);
 }
 const citadel=timelineEntries.find(e=>e.date==='2009-09-03');
 const article=data.entries[`${citadel.date}|${citadel.category}|${citadel.title}`];
 assert.equal(article.images.length,1);assert(article.details.length>=5);assert(article.detailMarkup.some(s=>s.includes('<strong>')));
 assert(article.links.some(l=>l.href==='http://citadellet.dk/homopolis/filmprogram-snart-ude'));
 assert.deepEqual(paragraphs({title:'Filmprogram snart ude, Citadel Avisen, Danmark.',display:'03.09.2009'},['Filmprogram snart ude','03.09.2009','Filmprogram snart ude, Citadel Avisen, Danmark.','Unik artikeltekst','Unik artikeltekst']),['Unik artikeltekst']);
 assert.equal(press,118,'All remaining Presse records, after removing the duplicate Dancing entry, have native content');
 for(const e of timelineEntries.filter(e=>e.href)){
  const key=`${e.date}|${e.category}|${e.title}`;
  assert(native.entries[key],e.title+' was left on the old iframe route');
  if(e.popupContent===false)assert.equal(canOpenTimelinePopup(e),false);
 }
 const app=fs.readFileSync('assets/site-app.js','utf8');
 assert(!app.includes('timeline-popup-archive')&&!app.includes('Indhold: ${n.title}'),'Legacy document iframe renderer remains');
 assert(app.includes('onClick:()=>openTimelineGallery(t,e,p)'),'Timeline uses more than one popup renderer');
 assert.deepEqual(timelineEffects,{live:'Morph',art:'Paint',press:'Contrast'});
 console.log(`PASS: ${press} native Presse records, ${photos} existing image references, safe emphasis, Citadel article/link, all archive routes migrated, no publisher logos or legacy iframe renderer`);
})().catch(e=>{console.error(e);process.exitCode=1});
