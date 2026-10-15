const assert=require('node:assert/strict');
(async()=>{
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const {timelineSearchNameSuggestion:suggestion}=await import('../assets/timeline-search-match.js');
 const entries=timelineEntries.map(entry=>({entry,title:entry.title}));
 for(const query of ['Dennis Agerblad','dennis agerblad','  DENNIS   AGERBLAD  ','Dennis Agerblad!']){
  const result=suggestion(query,entries);
  assert.equal(result.message,'Intet resultat. Mener du måske Tennis Sladderblad');
  assert.equal(result.matches.length,1);
  assert.equal(result.matches[0].entry.date,'2023-05-27');
  assert.equal(result.matches[0].entry.title,'Kønspolitisk Melodigrandprix, Bøssehuset');
  assert.equal(result.matches[0].matchedImages[0].src,result.matches[0].entry.thumbnail,'Suggestion has the exact Timeline image and opens its gallery');
 }
 for(const query of ['Dennis Agerblad Band','Dennis Agerblad røde briller','Tennis Sladderblad','Hairwerk','Dennis',''])assert.equal(suggestion(query,entries),null,'Other queries remain regular searches: '+query);
 console.log('PASS: exact requested wording, one correct event and Timeline image; case/spacing handled, other searches unchanged');
})().catch(error=>{console.error(error);process.exitCode=1});
