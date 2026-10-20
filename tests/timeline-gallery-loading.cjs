const fs=require('node:fs'),assert=require('node:assert/strict');
const {fileURLToPath}=require('node:url');
(async()=>{
  const attempts=new Map();let failMetadata=false;
  global.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  global.fetch=async url=>{
    const path=fileURLToPath(url),count=(attempts.get(path)||0)+1;attempts.set(path,count);
    if(count===1 || failMetadata&&path.endsWith('image-metadata.json'))throw Error('Temporary connection failure');
    return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path,'utf8'))};
  };
  const first=await import('../assets/timeline-gallery.js?test=transient');
  const recovered=await first.loadTimelineGalleryData();
  assert(Object.keys(recovered.entries).length>300,'A transient failure must not become an empty gallery');
  assert([...attempts.values()].every(count=>count===2),'Retry failed data files once');
  failMetadata=true;attempts.clear();
  const second=await import('../assets/timeline-gallery.js?test=metadata');
  const withoutMetadata=await second.loadTimelineGalleryData();
  const key='1979-06-10|Optræden|Mit første dragshow, hjemme hos min onkel, Tórshavn, Færøerne.';
  assert.equal(withoutMetadata.entries[key].images.length,6,'Missing dimensions must not remove the photos');
  console.log('PASS: transient data failures recover; missing optional image metadata preserves photo galleries');
})().catch(error=>{console.error(error);process.exitCode=1});
