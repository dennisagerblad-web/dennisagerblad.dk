const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {fileURLToPath}=require('node:url');
(async()=>{
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync('assets/site-language-data.js','utf8'),context);
  const dictionary=context.window.DennisEnglish,aliases=context.window.DennisPopupDanish;
  const inverse=new Map(Object.entries(dictionary).filter(([da,en])=>da!==en).map(([da,en])=>[en,da]));
  global.window={DennisLanguage:{danish:text=>aliases[text]||inverse.get(text)||text}};
  global.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  global.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(fileURLToPath(url),'utf8'))});
  const {timelineEntries}=await import('../content/timeline/entries.js');
  const {loadTimelineGalleryData}=await import('../assets/timeline-gallery.js');
  const {timelinePopupParagraphs:copy}=await import('../assets/timeline-popup-content.js');
  const data=await loadTimelineGalleryData();
  assert.deepEqual(copy({title:'Katalog'},['Forsiden af kataloget for efteråret 2011.','Forsiden af kataloget for efteråret 2011 med en optrædende i rød dragt.']),['Forsiden af kataloget for efteråret 2011 med en optrædende i rød dragt.']);
  assert.equal(copy({title:'Visninger'},['Torsdag den 27. januar 2011 kl. 22:00','Søndag den 30. januar 2011 kl. 22:00']).length,2,'Similar screening dates are distinct facts');
  for(const date of ['1979-06-10','1987-07-07','1991-04-10','2002-12-20','2026-06-05']){
    const e=timelineEntries.find(e=>e.date===date),g=data.entries[[e.date,e.category,e.title].join('|')];
    const text=copy(e,[e.details,...g.details].filter(Boolean));
    assert.equal(text.length,1,date+' must have one current description, without the old captions');
    assert(dictionary[text[0]],date+' must have an English version');
    assert(!text[0].includes('years old')&&!text[0].includes('opening the jacket'));
  }
  const e=timelineEntries.find(e=>e.date==='2008-09-20');
  const g=data.entries[[e.date,e.category,e.title].join('|')];
  assert(g.details[0].includes('Katrine Barfoed'),'Preserve photo credit in current description');
  const source=JSON.parse(fs.readFileSync('tools/i18n/popup-reviewed.json'));
  for(const [original,pair] of Object.entries(source)){
    assert.equal(window.DennisLanguage.danish(original),pair.da,original+' has wrong Danish source');
    assert.equal(dictionary[pair.da],pair.en,pair.da+' has wrong English translation');
  }
  // A credit may be split into separate text nodes by a linked/bold name.
  for(const language of ['da','en']){
    const document={currentScript:{src:'https://dennisagerblad.dk/assets/site-language.js'},documentElement:{},readyState:'loading',addEventListener(){}};
    const state={URL,document,location:{href:'https://dennisagerblad.dk/?lang='+language,pathname:'/'},localStorage:{getItem(){return null}},window:{DennisEnglish:dictionary,DennisPopupDanish:aliases}};
    vm.runInNewContext(fs.readFileSync('assets/site-language.js','utf8'),state);
    assert.equal(state.window.DennisLanguage.translate('Udgivet af: '),language==='en'?'Released by: ':'Udgivet af: ');
    assert.equal(state.window.DennisLanguage.translate('Hør STEV'),language==='en'?'Listen to STEV':'Hør STEV');
    assert.equal(state.window.DennisLanguage.danish('Released by: TUTL Records'),'Udgivet af: TUTL Records');
  }
  console.log(`PASS: screenshot examples have one description in each language; ${Object.keys(source).length} reviewed bilingual strings; photographer credits retained`);
})().catch(error=>{console.error(error);process.exitCode=1});
