const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 const {mobileGalleryRatios,galleryRatio,containRect}=await import('../assets/timeline-gallery.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const media=JSON.parse(fs.readFileSync('content/timeline/image-metadata.json')).media;
 let count=0;
 for(const g of Object.values(galleries)){
  const ratios=g.images.map(s=>media[s]).filter(m=>m?.width>0&&m?.height>0).map(m=>m.width/m.height);if(!ratios.length)continue;
  const e=mobileGalleryRatios(g.images,media);assert.equal(e.tallest,Math.min(...ratios));assert.equal(e.widest,Math.max(...ratios));assert.deepEqual(e,mobileGalleryRatios([...g.images].reverse(),media));
  assert.equal(galleryRatio(g.images,media),Math.max(...ratios),'Desktop also accommodates the widest photograph');
  for(const src of g.images){const m=media[src];if(!m?.width||!m?.height)continue;for(const frame of [[321,419],[224,162]]){const c=containRect(m.width,m.height,...frame);assert.ok(c[0]>=-.001&&c[1]>=-.001&&c[0]+c[2]<=frame[0]+.001&&c[1]+c[3]<=frame[1]+.001);assert.ok(Math.abs(c[2]/c[3]-m.width/m.height)<.00001);}}
  count++;
 }
 assert.deepEqual(mobileGalleryRatios(['tall','wide','square'],{tall:{width:600,height:1000},wide:{width:1600,height:900},square:{width:1000,height:1000}}),{tallest:.6,widest:16/9});
 console.log(`PASS: ${count} gallery envelopes independent of slide order; tallest controls portrait and widest controls landscape; full photos fit without cropping or distortion`);
})().catch(e=>{console.error(e);process.exitCode=1});
