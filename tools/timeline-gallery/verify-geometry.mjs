import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { galleryRatio, cropRect } from '../../assets/timeline-gallery.js';
const data=JSON.parse(await readFile(new URL('../../assets/timeline-gallery-data.json',import.meta.url),'utf8'));
let checked=0,landscape=0,portrait=0;
for(const entry of Object.values(data.entries)) {
 const valid=entry.images.filter(src=>data.media[src]);
 if(!valid.length) continue;
 const ratios=valid.map(src=>data.media[src].width/data.media[src].height);
 const result=galleryRatio(valid,data.media);
 assert(result>=Math.min(...ratios)-1e-10 && result<=Math.max(...ratios)+1e-10);
 if(ratios.every(r=>r>1)) { assert(result>1); landscape++; }
 if(ratios.every(r=>r<1)) { assert(result<1); portrait++; }
 const tall=ratios.filter(r=>r<1).length, wide=ratios.filter(r=>r>1).length;
 if(tall>wide) { assert(result<1); assert(galleryRatio(valid,data.media,2)<1); }
 if(wide>tall) { assert(result>1); assert(galleryRatio(valid,data.media,.5)>1); }
 assert(Math.abs(result-galleryRatio([...valid].reverse(),data.media))<1e-10);
 for(const src of valid) {
   const m=data.media[src], c=cropRect(m.width,m.height,result*1000,1000,m,true);
   assert(c && c[0]>=0 && c[1]>=0 && c[0]+c[2]<=m.width+1e-7 && c[1]+c[3]<=m.height+1e-7);
   assert(Math.abs(c[2]/c[3]-result)<1e-9,'cover crop preserves image proportions');
 }
 checked++;
}
const faces=[[.7,.1,.13,.2]];
const crop=cropRect(1000,800,390,520,{faces},true);
assert(crop && crop[0]<=700 && crop[0]+crop[2]>=830 && crop[1]<=80 && crop[1]+crop[3]>=240);
const separated=cropRect(1000,800,390,520,{faces:[[.05,.1,.2,.2],[.75,.1,.2,.2]]},true);
assert(separated && separated[0]<=50 && separated[0]+separated[2]>=250);
assert.equal(cropRect(800,1200,1600,900,{},true)[1],0,'portrait-to-landscape uses the top');
const mixed={tall:{width:600,height:1000},wide:{width:2000,height:800}};
assert(galleryRatio(['tall','tall','wide'],mixed,2)<1,'count wins over extreme aspect ratio');
assert(galleryRatio(['tall','wide'],mixed,.5)<1);
assert(galleryRatio(['tall','wide'],mixed,2)>1);
console.log(`PASS: ${checked} galleries; majority orientation on all viewports, proportional fill, top/face-prioritized cropping; ${landscape} landscape-only and ${portrait} portrait-only.`);
