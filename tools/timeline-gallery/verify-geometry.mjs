import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { galleryRatio, containRect } from '../../assets/timeline-gallery.js';
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
   const m=data.media[src], c=containRect(m.width,m.height,result*1000,1000);
   assert(c[0]>=0 && c[1]>=0 && c[0]+c[2]<=result*1000+1e-7 && c[1]+c[3]<=1000+1e-7);
   assert(c[2]<=m.width && c[3]<=m.height,'archive image must not be enlarged');
   assert(Math.abs(c[2]/c[3]-m.width/m.height)<1e-9,'complete image keeps its proportions');
   assert(Math.abs(c[0]-(result*1000-c[2])/2)<1e-7 && Math.abs(c[1]-(1000-c[3])/2)<1e-7);
 }
 checked++;
}
assert.deepEqual(containRect(800,1200,1600,900),[500,0,600,900],'a portrait image is fully visible in a wide frame');
assert.deepEqual(containRect(240,160,1600,900),[680,370,240,160],'small originals are not enlarged');
const mixed={tall:{width:600,height:1000},wide:{width:2000,height:800}};
assert(galleryRatio(['tall','tall','wide'],mixed,2)<1,'count wins over extreme aspect ratio');
assert(galleryRatio(['tall','wide'],mixed,.5)<1);
assert(galleryRatio(['tall','wide'],mixed,2)>1);
console.log(`PASS: ${checked} galleries; majority orientation, complete uncropped images, centered placement, and no upscaling; ${landscape} landscape-only and ${portrait} portrait-only.`);
