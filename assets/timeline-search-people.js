// Names and aliases supplied by the site owner. Photo identities need explicit evidence.
export const timelinePerformers = [
  {
    "id": "ramona-macho",
    "name": "Ramona Macho",
    "aliases": ["Ramona Macho"]
  },
  {
    "id": "rudi",
    "name": "Rudi",
    "aliases": ["Rudi"]
  },
  {
    "id": "tove-hansen",
    "name": "Tove Hansen",
    "aliases": [
      "Tove Hansen"
    ]
  },
  {
    "id": "hairwerk",
    "name": "Hairwerk Hugh Mongous",
    "aliases": [
      "Hairwerk Hugh Mongous",
      "Hairwerk Hugh Mongues",
      "Hugh Mongous",
      "Hugh Mongues",
      "Hairwerk"
    ]
  },
  {
    "id": "gina-la-mirage",
    "name": "Gina La Mirage",
    "aliases": [
      "Gina La Mirage"
    ]
  },
  {
    "id": "delores",
    "name": "Delores Duchess LaCour",
    "aliases": [
      "Delores Duchess LaCour",
      "Delores Düchess La Cour",
      "Delores Duchess La Cour",
      "Delores"
    ]
  },
  {
    "id": "athena-lady",
    "name": "Athena Lady",
    "aliases": [
      "Athena Lady",
      "Athena"
    ]
  },
  {
    "id": "areal",
    "name": "Areal",
    "aliases": [
      "Areal"
    ]
  },
  {
    "id": "blomst",
    "name": "Blomst",
    "aliases": [
      "Blomst"
    ]
  },
  {
    "id": "moma-van-vest",
    "name": "Moma Van Vest (Knud Vesterskov)",
    "aliases": [
      "Moma Van Vest",
      "Knud Vesterskov"
    ]
  },
  {
    "id": "florence",
    "name": "Florence",
    "aliases": [
      "Florence",
      "Florince",
      "Florance"
    ]
  },
  {
    "id": "tutu-wanna",
    "name": "Tutu Wanna",
    "aliases": [
      "Tutu Wanna"
    ]
  },
  {
    "id": "fraekke-froeken-fis",
    "name": "Frække Frøken Fis",
    "aliases": [
      "Frække Frøken Fis"
    ]
  },
  {
    "id": "bisgaard",
    "name": "Bisgaard",
    "aliases": [
      "Bisgaard"
    ]
  },
  {
    "id": "gitte-plads",
    "name": "Gitte Plads",
    "aliases": [
      "Gitte Plads"
    ]
  },
  {
    "id": "bent-jacobsen",
    "name": "Bent Jacobsen",
    "aliases": [
      "Bent Jacobsen"
    ]
  },
  {
    "id": "krisser",
    "name": "Krisser",
    "aliases": [
      "Krisser"
    ]
  },
  {
    "id": "ole-kongsdal-jensen",
    "name": "Ole Kongsdal Jensen",
    "aliases": [
      "Ole Kongsdal Jensen"
    ]
  },
  {
    "id": "maria-maud",
    "name": "Maria Maud",
    "aliases": [
      "Maria Maud"
    ]
  },
  {
    "id": "unni-ova-tolfsen",
    "name": "Unni Ova Tolfsen",
    "aliases": [
      "Unni Ova Tolfsen",
      "Unni Tolfsen"
    ]
  },
  {
    "id": "siv-ova-tolfsen",
    "name": "Siv Ova Tolfsen",
    "aliases": [
      "Siv Ova Tolfsen",
      "Siv Tolfsen"
    ]
  },
  {
    "id": "danny-boy",
    "name": "Danny Boy (Daniel Svanberg Bøtcher)",
    "aliases": [
      "Danny Boy",
      "Daniel Svanberg Bøtcher"
    ]
  }
];

// Name folding deliberately avoids appearance stemming: Blomst (a person)
// must stay distinct from blomster (flowers), and ø is distinct from o.
export function normalizePersonName(value) {
  return foldPersonText(value).replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
const foldPersonText=value=>String(value ?? '').toLocaleLowerCase('da-DK').replaceAll('å','aa').replaceAll('æ','ae').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const aliases=timelinePerformers.flatMap(person=>person.aliases.map(alias=>({id:person.id,text:normalizePersonName(alias)}))).sort((a,b)=>b.text.length-a.text.length);
const namePattern=text=>new RegExp(`(^|[^\\p{L}\\p{N}])${text.split(' ').map(escapePattern).join('[\\s:._()-]+')}(?=$|[^\\p{L}\\p{N}])`,'gu');
export function findTimelinePeople(text) {
  const normalized=normalizePersonName(text);
  // Common nouns require explicit people records, not appearance prose.
  return [...new Set(aliases.filter(alias=>!['blomst','areal'].includes(alias.id) && namePattern(alias.text).test(normalized)).map(alias=>alias.id))];
}
export function extractTimelinePeopleQuery(query) {
  let text=foldPersonText(query);
  const people=[];
  for(const alias of aliases) {
    text=text.replace(namePattern(alias.text),(whole,boundary)=>{people.push(alias.id);return boundary+' ';});
  }
  if(people.length) return {text,people:[...new Set(people)],peopleAny:[]};
  // Preserve name suggestions while typing. A prefix matches the start of a
  // name, never a random substring or a flower description.
  const prefix=normalizePersonName(query);
  const peopleAny=prefix.length>=3 ? [...new Set(aliases.filter(alias=>alias.text.startsWith(prefix)).map(alias=>alias.id))] : [];
  return {text:peopleAny.length ? '' : query,people:[],peopleAny};
}
