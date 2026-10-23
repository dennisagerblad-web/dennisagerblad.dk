import {extractTimelinePeopleQuery,findTimelinePeople} from './timeline-search-people.js?v=20261023-mental-health-people-1';
// Shared text matching for event copy and the existing, non-visible image descriptions.
export function normalizeTimelineSearch(value) {
  return String(value ?? '').toLocaleLowerCase('da-DK')
    .replaceAll('å','aa').replaceAll('æ','ae')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/polka[ -]?dots?/g,'prik')
    .replace(/prikk(?:erne|ede|et|er|en|e)\b/g,'prik')
    .replace(/\bkjol(?:erne|er|en|e)\b/g,'kjole')
    .replace(/strib(?:erne|ede|et|er|en|e)\b/g,'strib')
    .replace(/blomst(?:rede|ret|erne|er)\b/g,'blomst')
    .replace(/\b(?:røde|rødt)\b/g,'rød')
    .replace(/\b(?:hvide|hvidt)\b/g,'hvid')
    .replace(/\b(?:sorte|sortt)\b/g,'sort')
    .replace(/\b(?:gule|gult)\b/g,'gul')
    .replace(/\b(?:blaae|blaat)\b/g,'blaa')
    .replace(/\b(?:grønne|grønt)\b/g,'grøn')
    .replace(/\b(rød|blaa|gul|grøn|sort|hvid)(prik|strib)\b/g,'$1 $2');
}
const visualTerms=new Set(['prik','kjole','strib','blomst','rød','gul','sort','hvid','blaa','grøn','paryk','briller','sløjfe','kostume','hat','fjer','jakke','bukser','skjorte','top','pink','red','white','black','blue','green','yellow','silver','gold','dress','shirt','blouse','wig','bow','costume']);
const filler = new Set(['jeg','jeg havde','havde','har','var','er','min','mine','mit','en','et','med','paa','i','til','som','det','den','der','at','og','the','a','an','in','at','with','and','of']);
export function timelineSearchTerms(query) {
  return [...new Set((normalizeTimelineSearch(query).match(/[\p{L}\p{N}-]+/gu) || []).filter(term => !filler.has(term)))];
}
const colours = {rød:'red',gul:'yellow',grøn:'green',blaa:'blue',lilla:'purple',violet:'purple',orange:'orange',turkis:'turquoise',sort:'black',hvid:'white',pink:'pink',lyserød:'pink',graa:'grey',graat:'grey',sølv:'silver',gylden:'gold',guld:'gold',brun:'brown',brune:'brown'};
const colourWords = Object.keys(colours).sort((a,b)=>b.length-a.length).join('|');

// Recognised appearance phrases are checked against visually reviewed facts
// about Dennis by default, or explicitly identified performers when named.
export function parseTimelineSearchQuery(query) {
  const names=extractTimelinePeopleQuery(query);
  let text=normalizeTimelineSearch(names.text).replace(/microfon/gu,'mikrofon').replace(/stilletter/gu,'stiletter');
  const filters=[];
  function take(pattern, fact) {
    const re=new RegExp(`(^|[^\\p{L}\\p{N}])(?:${pattern})(?=$|[^\\p{L}\\p{N}])`,'gu');
    text=text.replace(re,(whole,boundary,...args)=>{
      // Remove replace callback's offset and source arguments.
      const captures=args.slice(0,-2);
      const value=typeof fact==='function' ? fact(...captures) : fact;
      filters.push(...(Array.isArray(value) ? value : [value]));
      return boundary+' ';
    });
  }
  take('dennis\\s+agerblad\\s+band','show:dennis-agerblad-band');
  take('(?:alene|solo)\\s+(?:paa\\s+)?(?:en\\s+)?scene(?:n)?','stage:alone');
  take('solo[ -]?show(?:s)?','show:solo');
  take('gruppe[ -]?show(?:s)?','show:group');
  take('(?:uden|ingen)\\s+briller','glasses:absent');
  take(`(${colourWords})\\s+(?:briller|brillestel)`,colour=>'glasses:'+colours[colour]);
  take(`(?:briller|brillestel)\\s+(?:i\\s+)?(${colourWords})`,colour=>'glasses:'+colours[colour]);
  take('solbriller(?:ne)?','glasses:sunglasses');
  take('briller(?:ne)?|brillestel','glasses:present');
  const hairColours={'graa':'grey','graat':'grey','lys':'light','lyst':'light','blond':'blond','blondt':'blond','blonde':'blond','mørk':'dark','mørkt':'dark','brun':'brown','brunt':'brown','sort':'black','hvid':'white','rød':'red','blaa':'blue','grøn':'green','lilla':'purple','violet':'purple','orange':'orange','pink':'pink','lyserød':'pink','turkis':'turquoise'};
  const hairColourWords=Object.keys(hairColours).sort((a,b)=>b.length-a.length).join('|');
  take(`(kort|lang(?:t)?)\\s+(${hairColourWords})\\s+paryk(?:ken)?`,(length,colour)=>['wig:'+(length==='kort' ? 'short' : 'long'),'hair:'+hairColours[colour]]);
  take(`(kort|lang(?:t)?)\\s+(${hairColourWords})\\s+haar`,(length,colour)=>['hair:'+(length==='kort' ? 'short' : 'long'),'hair:'+hairColours[colour]]);
  take(`(${hairColourWords})\\s+paryk(?:ker|ken)?`,colour=>['wig:present','hair:'+hairColours[colour]]);
  take('kort(?:e)?\\s+paryk(?:ker|ken)?','wig:short');
  take('lang(?:t|e)?\\s+paryk(?:ker|ken)?','wig:long');
  take('paryk(?:ker|ken)?','wig:present');
  take('kort(?:e)?\\s*haar','hair:short');
  take('lang(?:t|e)?\\s*haar','hair:long');
  take(`(${hairColourWords})\\s*haar`,colour=>'hair:'+hairColours[colour]);
  take(`haar\\s+(?:i\\s+)?(${hairColourWords})`,colour=>'hair:'+hairColours[colour]);
  take(`(${colourWords})\\s+(?:lave?\\s+)?stiletter`,colour=>'heels:'+colours[colour]);
  // Height can occur inside a shoe-colour phrase; it must remain a condition.
  if (new RegExp(`(?:${colourWords})\\s+lave?\\s+stiletter`,'u').test(normalizeTimelineSearch(query).replace(/stilletter/gu,'stiletter'))) filters.push('heels:low');
  take('lave?\\s+stiletter','heels:low');
  take('stiletter','heels:present');
  take(`(?:kostume(?:r)?|tøj|dragt(?:er)?|kjole(?:r)?)\\s+(?:i\\s+)?(${colourWords})`,colour=>'outfit:'+colours[colour]);
  take(`(${colourWords})\\s+(?:(prik|strib|blomst)\\s+)?(kostume(?:r)?|tøj|dragt(?:er)?|kjole(?:r)?)`,(colour,pattern,garment)=>[
    'outfit:'+colours[colour], ...(garment.startsWith('kjole') ? ['clothing:dress'] : []), ...(pattern==='prik' ? ['pattern:dots'] : [])
  ]);
  take('mikrofon(?:en|er)?','microphone:handheld');
  take('(udendørs|udendørsshow(?:s)?)',word=>word==='udendørs' ? 'setting:outdoor' : ['setting:outdoor','show:performance']);
  take('sceneshow(?:s)?|scene(?:n)?','setting:stage');
  take('direkte\\s+blik|(?:ser|kigger)\\s+(?:direkte\\s+)?(?:ind\\s+)?i\\s+kameraet','gaze:direct');
  take('ligger|liggende|ligge','pose:lying');
  take('danser|dans(?:e|ende)?','pose:dancing');
  take('raab(?:e|er|ende)?','mouth:open');
  take('tørklaede(?:r|t)?','clothing:scarf');
  take('klassisk\\s+makeup|smukke?\\s+ansigt(?:er)?','makeup:classic');
  // Keep search groups specific: visible penis, testicles, rear anatomy, and
  // general bare-body imagery each use their own reviewed facts.
  take('nosser(?:ne)?|testikler(?:ne)?|testicles?','body:testicles-visible');
  take('røvhul(?:let|ler)?|numsehul(?:let|ler)?|anus','anatomy:rear');
  // These words describe a generally bare body, including reviewed costume
  // depictions. They do not make a photo match the specific anatomy groups.
  take('nøgenhed|nøg(?:en|ne|ent)|nudity|naked|nude|hud(?:en)?|skin|bar(?:e)?(?:\\s+(?:krop(?:pe)?|overkrop|hud))?','nudity:any');
  // Keep known song/poster phrases searchable as titles rather than anatomy.
  if(!/\b(?:pik\s+nok|gratis\s+pik\s+og\s+pat|stiv\s+pik\s+til\s+alle)\b/u.test(text)) take('pik(?:ken|ke)?|penis(?:sen)?','body:penis-visible');
  take('(?:bare\\s+)?(?:røv(?:en)?|rumpe(?:n)?|balder(?:ne)?|bagdel(?:en)?|buttocks)','anatomy:rear');
  take('bar(?:e)?\\s+overkrop|topløs|topless','body:bare-torso');
  take('overtøj','clothing:outerwear');
  take('undertøj','clothing:underwear');
  take('nylonstrømpe(?:kostume(?:r)?|dragt(?:er)?)|nylonkostume(?:r)?','clothing:nylon-costume');
  take('brunlige?\\s+looks?|brunligt\\s+look','look:brown');
  take('prik','pattern:dots');
  take('kjole','clothing:dress');
  take(`(${colourWords})`,colour=>'appearance:'+colours[colour]);
  if(filters.length) {
    // These words describe the requested photo, not additional event keywords.
    text=text.replace(/(^|[^\p{L}\p{N}])(?:billeder?|fotos?|fotografier|hvor|mig|jeg|selv|synlig|synlige|synligt|holder|staar|ned|paa|en|med|kostume(?:r)?|tøj|dragt(?:er)?|dennis(?:\s+agerblad)?)(?=$|[^\p{L}\p{N}])/gu,'$1 ');
    if(/show:solo|show:group|stage:alone/u.test(filters.join(' '))) text=text.replace(/\bshows?\b/gu,' ');
    if(/\bshows?\b/u.test(text)) { filters.push('show:performance'); text=text.replace(/\bshows?\b/gu,' '); }
  }
  if(filters.includes('pattern:dots') && filters.includes('clothing:dress')) {
    filters.splice(filters.indexOf('pattern:dots'),1);
    filters.splice(filters.indexOf('clothing:dress'),1);
    filters.push('dress:dots');
  }
  return {terms:timelineSearchTerms(text),filters:[...new Set(filters.filter(fact=>fact!=='clothing:outfit'))],people:names.people,peopleAny:names.peopleAny};
}
function matchesReviewedFacts(image, filters, people=[]) {
  if(!filters.length) return true;
  const appearance=filters.some(fact=>!fact.startsWith('show:') && !fact.startsWith('setting:'));
  const anatomyOnly=filters.every(fact=>fact.startsWith('body:') || fact.startsWith('nudity:') || fact.startsWith('anatomy:'));
  const anatomy=(image.anatomy || []).filter(facts=>facts.reviewed && facts.subject);
  const matchSubject=subject=>{
    const facts=subject==='dennis' ? image.look : image.peopleLooks?.[subject];
    const validLook=facts?.reviewed && facts.subject!=='unknown' && (!appearance || facts.subject===subject);
    const body=anatomy.filter(facts=>facts.subject===subject);
    if(!validLook && !body.length) return false;
    const tags=new Set([...(validLook ? facts.tags : []),...body.flatMap(facts=>facts.tags)]);
    return filters.every(fact=>{
    if(fact==='nudity:any') return ['nudity:visible','body:penis-visible','body:buttocks-visible','body:testicles-visible','body:anus-visible','body:bare-torso','costume:nudity','costume:penis','costume:buttocks','costume:testicles'].some(tag=>tags.has(tag)) || body.some(facts=>(facts.ownerSearchLabels||[]).some(label=>/^(?:pik|penis|nosser|testikler|røv|røvhul|numsehul)$/iu.test(label)));
    if(fact==='anatomy:rear') return ['body:buttocks-visible','body:anus-visible','costume:buttocks'].some(tag=>tags.has(tag));
    // Owner-approved costume anatomy participates in the same searches,
    // while its alt text and review tags explicitly describe the costume.
    const costumeEquivalent={'nudity:visible':'costume:nudity','body:penis-visible':'costume:penis','body:buttocks-visible':'costume:buttocks','body:testicles-visible':'costume:testicles'}[fact];
    if(costumeEquivalent && tags.has(costumeEquivalent)) return true;
    if(fact==='body:penis-visible' && body.some(facts=>(facts.ownerSearchLabels||[]).some(label=>/^pik(?:ken)?$/iu.test(label)))) return true;
    if(fact==='hair:blond') return tags.has('hair:blond') || (tags.has('hair:light') && !tags.has('hair:grey'));
    if(fact==='hair:dark') return tags.has(fact) || tags.has('hair:brown') || tags.has('hair:black');
    if(fact.startsWith('appearance:')) {
      const colour=fact.slice('appearance:'.length);
      return tags.has(fact) || ['outfit:','glasses:','heels:'].some(prefix=>tags.has(prefix+colour));
    }
    return tags.has(fact);
    });
  };
  // Unqualified anatomy searches include any reviewed pictured person.
  // Keep every requested fact on one person, even in a group photograph.
  if(anatomyOnly && !people.length) {
    const subjects=new Set(['dennis',...Object.keys(image.peopleLooks || {}),...anatomy.map(facts=>facts.subject)]);
    return [...subjects].some(matchSubject);
  }
  // Ordinary looks still describe Dennis, or the explicitly named performer.
  const subjects=appearance && people.length ? people : ['dennis'];
  return subjects.every(matchSubject);
}
export function matchTimelineResult(result, query, english = value => value) {
  const {terms,filters=[],people=[],peopleAny=[]}=Array.isArray(query) ? {terms:query} : query;
  if (!terms.length && !filters.length && !people.length && !peopleAny.length) return null;
  const eventText = result.searchable + ' ' + normalizeTimelineSearch([
    result.entry.title,result.entry.shortTitle,result.entry.popupTitle,
    result.entry.details,result.entry.category,...(result.galleryDetails || []),
  ].map(text => english(text || '') || text).join(' '));
  const named=people.length || peopleAny.length;
  const namedMatch=ids=>people.every(id=>ids.includes(id)) && (!peopleAny.length || peopleAny.some(id=>ids.includes(id)));
  const eventPeople=named ? [...new Set([...(result.people || findTimelinePeople(eventText)),...(result.images || []).flatMap(image=>image.people || findTimelinePeople(image.description))])] : [];
  const matchesMedia = image => {
    const imagePeople=named ? image.people || findTimelinePeople(image.description) : [];
    if(!namedMatch(imagePeople) || !matchesReviewedFacts(image,filters,people.length ? people : peopleAny.filter(id=>imagePeople.includes(id)))) return false;
    const text = normalizeTimelineSearch(image.description + ' ' + (english(image.description) || ''));
    // Keep all requested details on the same photograph; don't combine a
    // dotted blouse in one image with a plain dress in another image.
    return terms.every(term => text.includes(term) || (!visualTerms.has(term) && eventText.includes(term))) && (named || filters.length || terms.some(term => text.includes(term)));
  };
  const matchedImages = (result.images || []).filter(matchesMedia);
  // Video content has its own confirmed facts; never borrow appearance or
  // anatomy facts from the poster or from a different photograph.
  const matchedVideos = (result.videos || []).filter(matchesMedia);
  const eventMatch=!filters.length && namedMatch(eventPeople) && terms.every(term => eventText.includes(term)) && (!result.images?.length || !terms.some(term=>visualTerms.has(term)) || matchedImages.length);
  return eventMatch || matchedImages.length || matchedVideos.length
    ? {...result,matchedImages,matchedVideos} : null;
}

// Display an event's own Timeline thumbnail when the query matched its text.
// This never changes photo/person/appearance matching or claims a photo match.
export function timelineSearchResultMedia(result) {
  const matched=[...(result.matchedImages || []),...(result.matchedVideos || [])];
  if(matched.length) return matched;
  const entry=result.entry;
  const src=entry.thumbnail || entry.thumbnailPreview;
  if(src) return [{kind:'timeline-thumbnail',src,thumbnail:entry.thumbnailPreview || src,thumbnailAlt:result.timelineThumbnailAlt || result.title || entry.shortTitle || entry.title}];
  const image=result.images?.[0];
  return image ? [{...image,kind:'timeline-thumbnail',thumbnail:image.thumbnail || image.src,thumbnailAlt:image.thumbnailAlt || image.description}] : [];
}

// The owner's name alone has a dedicated suggestion rather than a name search.
export function timelineSearchNameSuggestion(query, results) {
  if(!/^dennis(?:\s+agerblad)?[.!?]*$/u.test(normalizeTimelineSearch(query).trim())) return null;
  const target=results.find(result=>result.entry.date==='2023-05-27' && result.entry.group==='live' && result.entry.title==='Kønspolitisk Melodigrandprix, Bøssehuset');
  const matches=target ? [{...target,matchedImages:timelineSearchResultMedia({...target,matchedImages:[],matchedVideos:[]}),matchedVideos:[]}] : [];
  return {message:'Intet resultat. Mener du måske Tennis Sladderblad',matches};
}
