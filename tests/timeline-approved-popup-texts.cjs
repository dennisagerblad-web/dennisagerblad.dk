const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
  const {timelineEntries}=await import('../content/timeline/entries.js');
  const {timelinePopupParagraphs:body}=await import('../assets/timeline-popup-content.js');
  const proof=JSON.parse(fs.readFileSync('docs/timeline-popup-texts-20261022.json'));
  const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
  const native=JSON.parse(fs.readFileSync('content/timeline/popup-content.json')).entries;
  const language={window:{}};vm.runInNewContext(fs.readFileSync('assets/site-language-data.js','utf8'),language);
  const dict=language.window.DennisEnglish,aliases=language.window.DennisPopupDanish;
  const key=e=>[e.date,e.category,e.title].join('|');
  assert.equal(proof.eventsUpdated,91);assert.equal(proof.skipped.length,2);
  for(const row of proof.records){
    const entry=timelineEntries.find(e=>key(e)===row.key);assert(entry,row.key);
    assert.deepEqual(entry.popupParagraphs,row.da,row.key+' preserves approved paragraphs');
    assert.equal(entry.details,row.da[0]);
    const old=['Old archive caption',entry.details,...(galleries[row.key]?.details||[]),...(native[row.key]?.details||[])];
    assert.deepEqual(body(entry,old),row.da,row.key+' renders each paragraph once');
    row.da.forEach((text,i)=>{
      assert.equal(dict[text],row.en[i],row.key+' has the matching English paragraph');
      assert.equal(aliases[text]||text,text,row.key+' is not redirected to old Danish copy');
    });
    if(row.sourceKey!==row.key)assert(entry.shareAliases.includes(row.sourceKey),'Old review links still open the renamed event');
  }
  const grandprix=timelineEntries.find(e=>e.date==='2026-06-05'&&e.category==='Melodigrandprix');
  assert(!grandprix.popupParagraphs,'Keep the previously fixed Grandprix text');
  assert(!timelineEntries.some(e=>key(e)==='2006-05-05|Film|Dancing'),'Do not restore the deleted duplicate');
  assert(!JSON.stringify(proof.records).includes('Jeg har skrevet i tråden'),'Do not publish editorial instructions');
  const christmas=proof.records.find(r=>r.key.startsWith('2025-12-19|'));
  assert.equal(christmas.da.length,2,'The early backstage addition retains the performance story');
  for(const current of ['da','en']){
    const document={currentScript:{src:'https://dennisagerblad.dk/assets/site-language.js'},documentElement:{},readyState:'loading',addEventListener(){}};
    const state={URL,document,location:{href:'https://dennisagerblad.dk/?lang='+current,pathname:'/'},localStorage:{getItem(){return null}},window:{DennisEnglish:dict,DennisPopupDanish:aliases}};
    vm.runInNewContext(fs.readFileSync('assets/site-language.js','utf8'),state);
    for(const row of proof.records)row.da.forEach((text,i)=>{
      assert.equal(state.window.DennisLanguage.translate(text),current==='en'?row.en[i]:text,row.key+' uses only the selected language');
    });
  }
  console.log('PASS: all 91 approved event descriptions render once; 104 paragraphs have Danish and English versions; renamed links and earlier fixes retained.');
})().catch(error=>{console.error(error);process.exitCode=1});
