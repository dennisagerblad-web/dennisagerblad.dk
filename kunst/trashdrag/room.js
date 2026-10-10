// Same single-camera projection and homography used in the site's Kunst rooms.
const space=document.querySelector('.room-space'),room=document.querySelector('.black-room');
const W=1280,H=720,VP=[640,293],depth=1.1,camera=1,roomWidth=2,roomHeight=2.4,focal=400;
const point=(x,y,z)=>[VP[0]+focal*x/(camera+z),VP[1]+focal*(roomHeight/2-y)/(camera+z)];
function homography(src,dst){const rows=[];src.forEach(([x,y],i)=>{const[u,v]=dst[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(rows[r][c])>Math.abs(rows[p][c]))p=r;[rows[c],rows[p]]=[rows[p],rows[c]];const d=rows[c][c];for(let k=c;k<9;k++)rows[c][k]/=d;for(let r=0;r<8;r++){if(r===c)continue;const f=rows[r][c];for(let k=c;k<9;k++)rows[r][k]-=f*rows[c][k];}}const[a,b,c,d,e,f,g,h]=rows.map(r=>r[8]);return `matrix3d(${[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1].join(',')})`;}
const quad=(x0,x1,y0,y1,z)=>[point(x0,y1,z),point(x1,y1,z),point(x1,y0,z),point(x0,y0,z)];
function sideQuad(side,z,len,photoBottomY,photoTopY){const x=side==='left'?-roomWidth/2:roomWidth/2;const q=[point(x,photoTopY,z),point(x,photoTopY,z+len),point(x,photoBottomY,z+len),point(x,photoBottomY,z)];return side==='left'?q:[q[1],q[0],q[3],q[2]];}
// Back-wall hanging levels anchor the perspective guides for all six works.
const photoTopY=point(0,2.05,depth)[1],photoBottomY=point(0,1.05,depth)[1];
const textTop=point(0,1.55+.297/2,depth)[1],textBottom=point(0,1.55-.297/2,depth)[1];
const flat=(left,right,t,b)=>[[left,t],[right,t],[right,b],[left,b]];
// Continue the back-wall hanging levels along the side-wall guides in the supplied drawing.
// The nearer edges are taller; photo and lyric boundaries each follow their own guide.
const wallLeft=430,wallRight=850;
const photoGuideTop=x=>photoTopY-.43*Math.max(wallLeft-x,x-wallRight,0);
const photoGuideBottom=x=>photoBottomY+.27*Math.max(wallLeft-x,x-wallRight,0);
const lyricGuideTop=x=>textTop-.18*Math.max(wallLeft-x,x-wallRight,0);
const lyricGuideBottom=x=>textBottom+.085*Math.max(wallLeft-x,x-wallRight,0);
const guided=(left,right,upper,lower)=>[[left,upper(left)],[right,upper(right)],[right,lower(right)],[left,lower(left)]];
const corners=[
 guided(280,370,photoGuideTop,photoGuideBottom),
 guided(382,409,lyricGuideTop,lyricGuideBottom),
 quad(-.68,.073,1.05,2.05,depth),
 flat(point(.13,0,depth)[0],point(.34,0,depth)[0],textTop,textBottom),
 guided(890,980,photoGuideTop,photoGuideBottom),
 guided(992,1019,lyricGuideTop,lyricGuideBottom)
];
space.querySelectorAll('.room-work').forEach((el,i)=>{const w=i%2===0?527:210,h=i%2===0?700:297;el.dataset.wallQuad=JSON.stringify(corners[i]);el.style.width=w+'px';el.style.height=h+'px';el.style.transform=homography([[0,0],[w,0],[w,h],[0,h]],corners[i]);});
function resizeRoom(){const crop=window.matchMedia('(max-width:600px)').matches ? .7 : 1;const scale=room.clientWidth/(W*crop);space.style.left=`${-W*(1-crop)*scale/2}px`;space.style.transform=`scale(${scale})`;}
new ResizeObserver(resizeRoom).observe(room);
