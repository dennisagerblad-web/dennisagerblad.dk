const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fileURLToPath,pathToFileURL}=require('node:url');
(async()=>{
  globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8'))});
  const {loadTimelineGalleryData,galleryEffects,timelineEffects,mobileGalleryRatios,containRect}=await import('../assets/timeline-gallery.js');
  const base=JSON.parse(fs.readFileSync('content/timeline/galleries.json','utf8'));
  const originalMedia=JSON.parse(fs.readFileSync('content/timeline/image-metadata.json','utf8')).media;
  const press=JSON.parse(fs.readFileSync('content/timeline/press-galleries.json','utf8'));
  const merged=await loadTimelineGalleryData();
  assert.deepEqual(timelineEffects,{live:'Morph',art:'Paint',press:'Contrast'});
  assert.deepEqual(galleryEffects.Grow,{shader:0,intensity:0,duration:1000});
  assert.deepEqual(galleryEffects.Paint,{shader:1,intensity:0,duration:1100});
  assert.deepEqual(galleryEffects.Morph,{shader:2,intensity:.3,duration:1000});
  for(const [key,gallery] of Object.entries(base.entries)) {
    if(!press.entries[key]) assert.deepEqual(merged.entries[key],gallery,`Unrelated gallery changed: ${key}`);
    else { assert.deepEqual(merged.entries[key].images,gallery.images,`Curated order changed: ${key}`);assert.deepEqual(merged.entries[key].imageDescriptions,gallery.imageDescriptions,`Curated descriptions changed: ${key}`); }
  }
  for(const [src,record] of Object.entries(originalMedia)) {
    assert.deepEqual(merged.media[src],record,`Existing photo metadata changed: ${src}`);
  }
  let count=0,slides=0;
  for(const [key,gallery] of Object.entries(press.entries)) {
    assert(gallery.images.length>1,key);
    assert.equal(new Set(gallery.images).size,gallery.images.length,`Duplicate slide: ${key}`);
    assert(gallery.imageDescriptions.length===gallery.images.length,key);
    for(const src of gallery.images) {
      assert(fs.existsSync(fileURLToPath(new URL(src,pathToFileURL(process.cwd()+'/')))),src);
      const size=merged.media[src];assert(size?.width>0&&size?.height>0,src);
      for(const [w,h] of [[353,480],[772,175]]) {
        const [x,y,iw,ih]=containRect(size.width,size.height,w,h);
        assert(x>=-.001&&y>=-.001&&x+iw<=w+.001&&y+ih<=h+.001,src);
        assert(Math.abs(iw/ih-size.width/size.height)<1e-8,src);
      }
    }
    for(const link of gallery.links || []) assert(/^(https?:|mailto:)/.test(link.href)&&link.label,key);
    for(const parts of Object.values(gallery.composites || {})) {
      assert(parts.length>1,key);for(const src of parts) assert(fs.existsSync(path.resolve(src)),src);
    }
    const ratios=mobileGalleryRatios(gallery.images,merged.media);
    assert(ratios.tallest>0&&ratios.widest>=ratios.tallest,key);
    count++;slides+=gallery.images.length;
  }
  assert(count>=40,'All existing multi-image Presse entries must be indexed');
  // A missing optional Presse index cannot break the other four tabs.
  globalThis.fetch=async url=>({ok:!String(url).includes('press-galleries.json'),json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8'))});
  const fallback=await import('../assets/timeline-gallery.js?press-index-failure-test');
  const withoutPress=await fallback.loadTimelineGalleryData();
  assert.deepEqual(withoutPress.entries,base.entries);
  assert.deepEqual(withoutPress.media,originalMedia);
  console.log(`PASS: ${count} Presse galleries, ${slides} slides, preserved other galleries/effects/metadata, original photo ratios and optional-index fallback`);
})().catch(error=>{console.error(error);process.exitCode=1});
