from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[2];folder=root/'tools/i18n'
items=json.loads((folder/'inventory.json').read_text());raw=json.loads((folder/'translated.json').read_text());reviewed=json.loads((folder/'reviewed.json').read_text());dictionary={}
protected=['Dunst','maður:glotti','Tóroddur Poulsen','Tunga musiK','TUTL','BØSSEDANMARK','Bøssehuset','Den Grå Hal','Listaskálin','Málhøvd','Sproghoved','Dun','Larm','Selleri','Fantasi','Gi’ Den Gas','Håb','Vón','Flaget / Flaggið','Det samme som mig','Bol Mig I Mit Numsehul','Bol mig i mit numsehul','Københavns værste trash drag','Tennis Sladderblad','Lesbisk Sadist','Tú spurdi meg','Eg sigi ja','Av nýggjum','land','mannfólk','Dunst show','STEV']
aliases={'Dunst':['Haze','haze','vapor','Vapor'],'maður:glotti':['man: glottis','man:glottis'],'Málhøvd':['Målhøvd','Target head','Head of target','Head of Target','Head of target'],'Sproghoved':['Language header','language header','Head of language','Head of Language'],'Bøssehuset':['The Gay House','the Gay House','The gay house','the gay house'],'Den Grå Hal':['The Gray Hall','the Gray Hall','The Grey Hall'],'Listaskálin':['Listskálin','Listskálin'],'Tunga musiK':['Tongue music','Tunga music'],'Dun':['Down'],'Larm':['Noise'],'Tú spurdi meg':['You asked me'],'Eg sigi ja':['I say yes'],'Håb':['Hope'],'Fantasi':['Fantasy'],'Selleri':['Celery'],'Bol mig i mit numsehul':['Bump in my butthole','Bol me in my butthole']}
aliases['maður:glotti'] += ['man:glotti','maðn:glotti','mamm:glotti','madur:glotti']
aliases['Bøssehuset'] += ['Bosse huset','Bosse House','Bøsse House','Bossehouse','Bossehuset','Gøssehuset']
aliases['Sjæl På Dåse'] = ['Soul on Can','Soul on Dåse','Soul In A Can','Soul in a Can']
aliases['Operaen'] = ['The Opera','the Opera']
aliases['kunst i dunst'] = ['art in steam','art in haze','Art in Dunst']
for item in items:
 key=str(item['id']);source=item['da'];target=reviewed.get(key,raw.get(key))
 if target is None:raise ValueError('Missing translation: '+key)
 # Keep names and release titles intact, including inside image descriptions.
 for name,variants in aliases.items():
  if name.lower() in source.lower():
   for variant in variants:target=re.sub(r'(?<!\w)'+re.escape(variant)+r'(?!\w)',name,target)
 target=target.replace('Denmark has Talent',"Denmark's Got Talent").replace('Denmark has talent',"Denmark's Got Talent")
 if source in protected:target=source
 if source.startswith('Se ') and ' på YouTube' in source:
  title=source[3:source.index(' på YouTube')]
  title=title.replace(' – semifinale',' – semi-final').replace(' – første liveshow',' – first live show')
  target='Watch '+title+' on YouTube'+(' ↗' if source.endswith('↗') else '')
 if source.startswith('Hør ') and ' på Bandcamp' in source:target='Listen to '+source[4:source.index(' på Bandcamp')]+' on Bandcamp'
 if source.startswith('Hør ') and source[4:] in ['Sproghoved / Málhøvd REMIXED','Dun / Larm REMIXED']:target='Listen to '+source[4:]
 if re.match(r'^(.+?)( – | — )(dansk version|færøsk version)',source):
  target=source.replace('dansk version','Danish version').replace('færøsk version','Faroese version')
 if re.match(r'^(Selleri|Fantasi|Gi’ Den Gas) – ',source):
  target=source.replace('semifinale','semi-final').replace('første liveshow','first live show').replace('i Danmark har talent',"on Denmark's Got Talent")
 if re.match(r'^(Bol Mig I Mit Numsehul|Bol mig i mit numsehul|Københavns værste trash drag) – Dennis Agerblad$',source):target=source
 # Do not translate code-like strings accidentally captured from the compiled bundle.
 if re.match(r'^(?:M\d|rgb\(|\.|\[src|body \*|in t&&|[a-z]+-[a-z]+(?: [a-z]+-[a-z]+)*$)',source):target=source
 dictionary[source]=target
extras={
 'Music':'Music','Video':'Video','Performance':'Performance','Art':'Art','Timeline':'Timeline',
 'DEL':'SHARE','Del':'Share','Del denne side':'Share this page','Del dette opslag':'Share this post',
 'Kopiér link':'Copy link','Linket er kopieret':'Link copied','Kopiér det markerede link':'Copy the selected link','Del via …':'Share via …','Link til siden':'Page link','Link til opslaget':'Post link','Luk siden og gå tilbage':'Close page and go back','Linket åbner direkte på dette opslag.':'This link opens the post directly.','Brug Kopiér link i stedet':'Use Copy link instead',
 'Tilbage':'Back','Tilbage til menu':'Back to menu','Hovedmenu':'Main menu','Dennis Agerblads hjemmeside':"Dennis Agerblad's website",'Tidslinjen':'Timeline','Om Dennis Agerblad':'About Dennis Agerblad',
 'Galleri 1':'Gallery 1','Galleri 2':'Gallery 2','Gang':'Hallway','Vælg kunstgalleri':'Choose art gallery','Luk galleri':'Close gallery','Luk kunstvisning':'Close art viewer','Billedgalleri':'Image gallery','karrusel':'carousel',
 'Selvportrætter i Trashdrag':'Trashdrag Self-Portraits','Færøske Selvportrætter':'Faroese Self-Portraits','Det Skjulte Kys':'The Hidden Kiss','Maleriserie':'Painting Series','Selvportrætter':'Self-Portraits','Voksen Dukke Leg':'Adult Doll Play','Kongeligt Porcelæn':'Royal Porcelain','kunst i dunst, Kollager, 30×30 cm':'kunst i dunst, Collages, 30×30 cm','Pige':'Girl','To sider af en sjæl':'Two Sides of a Soul','Pige, tekstilværk':'Girl, textile artwork','Foto, Kollage, Maleri':'Photography, collage, painting','Akryl på masonit med metalbeslag':'Acrylic on hardboard with metal fittings','- Installation':'- Installation','Koppen set ovenfra':'The cup viewed from above','Genstandene må ikke berøres':'Do not touch the objects','Interaktivt kunstgalleri':'Interactive art gallery','Seriens værkbilleder er ikke tilføjet endnu.':'Images of this series have not been added yet.',
 'Søg i tidslinjen':'Search the timeline','Søg i hele tidslinjen':'Search the whole timeline','Ryd søgning':'Clear search','Ingen resultater':'No results','Trashdrag på Listaskálin':'Trashdrag at Listaskálin','I':'In','. I':'. In','og':'and','i':'in','med':'with','Afspil':'Play','Pause':'Pause',
 'Åbn musiktjenester ↗':'Open music services ↗','Kamera: Søren Meisterbrau, Lea Birkedal.':'Camera: Søren Meisterbrau, Lea Birkedal.',
 'Sproghoved / Málhøvd':'Sproghoved / Málhøvd','Málhøvd / Sproghoved':'Málhøvd / Sproghoved','Sproghoved / Málhøvd — REMIXED':'Sproghoved / Málhøvd — REMIXED','Sproghoved / Málhøvd REMIXED':'Sproghoved / Málhøvd REMIXED','Dun / Larm — REMIXED':'Dun / Larm — REMIXED','Dun / Larm REMIXED':'Dun / Larm REMIXED','dunst — odéur':'dunst — odéur','Flaget / Flaggið':'Flaget / Flaggið','Flaget // Flaggið':'Flaget // Flaggið','Det Samme Som Mig':'Det Samme Som Mig','Normal Man':'Normal Man',
 'Se Dennis Agerblad Bands 3 medvirkener i Danmark har talent-showet':"Watch Dennis Agerblad Band's three performances on Denmark's Got Talent",'Bol Mig I Mit Numsehul – se videoen og historien bag':'Bol Mig I Mit Numsehul – watch the video and read the story','Københavns værste trash drag – se videoen og historien bag':'Københavns værste trash drag – watch the video and read the story',
 'TrashDragDronnig Dennis Agerblad af Færøerne':'Trashdrag Queen Dennis Agerblad of the Faroe Islands'
}
extras.update({
 '. Men der skjulte jeg min seksualitet i tekster om natur og landskaber. Nu havde jeg chancen for at smide alle hæmninger.':'. But there I hid my sexuality in lyrics about nature and landscapes. Now I had the chance to let go of all my inhibitions.',
 'Se videoen på YouTube ↗':'Watch the video on YouTube ↗',
 'Hør singlen på Bandcamp':'Listen to the single on Bandcamp',

 'Dennis Agerblad Band i Danmark har talent':"Dennis Agerblad Band on Denmark's Got Talent", 'Blomster':'Blomster', 'På loftet sidder nissen':'På loftet sidder nissen', 'Lesbisk Sadist — Copenhagen Pride':'Lesbisk Sadist — Copenhagen Pride', 'Bøssehusets Sommerfest':'Bøssehusets Sommerfest', 'Til forsiden':'Back to the homepage', '. Mit debutalbum hedder':'. My debut album is called', 'Mit debutalbum hedder':'My debut album is called', 'Dunst-udgivelse.':'A Dunst release.',
 'Udforsk Dennis Agerblads kunstneriske univers med musik, performance, billedkunst og en interaktiv tidslinje med billeder, videoer og dokumentation.':"Explore Dennis Agerblad's artistic world through music, performance, visual art and an interactive timeline of photographs, videos and documentation.",
 'Mine seks Trashdrag-selvportrætter og installationen Dunst show på Listaskálin i Tórshavn. Se billeder fra udstillingen Identitet i 2009.':'My six Trashdrag self-portraits and the Dunst show installation at Listaskálin in Tórshavn. See photographs from the 2009 Identitet exhibition.',
 'Historien bag min yndlingsvideo, Københavns værste trash drag: Distortion på Vesterbro, skjulte høretelefoner og et filmhold midt i gadefesten.':'The story behind my favourite video, Københavns værste trash drag: Distortion in Vesterbro, hidden headphones and a film crew in the middle of a street party.',
 'Historien om min første performance med Bol mig i mit numsehul: Dunst, en fest i Hal D på Holmen og begyndelsen på næsten 25 år på scenen.':'The story of my first performance of Bol mig i mit numsehul: Dunst, a party at Hal D on Holmen and the start of nearly 25 years on stage.',
 'Dunst, en fest i Hal D på Holmen og sangen Bol mig i mit numsehul. Her fortæller jeg, hvordan mine egne performances begyndte.':'Dunst, a party at Hal D on Holmen and the song Bol mig i mit numsehul. Here I tell the story of how my own performances began.',
 'Se Dennis Agerblad Bands tre optrædener i Danmark har Talent, læs historien bag deltagelsen, og oplev finalenummeret Transformation.':"Watch Dennis Agerblad Band's three performances on Denmark's Got Talent, read the story of how we took part and discover our planned final number, Transformation.",
 'Mit soloalbum med elektronisk musik til Tóroddur Poulsens digte. Læs historien om Sproghoved / Málhøvd, hør albummet og se musikvideoerne på dansk og færøsk.':"My solo album of electronic music set to Tóroddur Poulsen's poems. Read the story of Sproghoved / Málhøvd, listen to the album and watch the music videos in Danish and Faroese.",
})
dictionary.update(extras)
dictionary['BØSSEDANMARK'] = 'BØSSEDANMARK (GAYDENMARK)'
# Use the English song title throughout the English copy.
for source, target in dictionary.items():
 dictionary[source] = re.sub(r'Bol mig i mit numsehul', 'Fuck me in my butthole', target, flags=re.I).replace('in my arsehole', 'in my butthole')
for source, target in dictionary.items():
 dictionary[source] = re.sub(r'Københavns værste trash drag(?!\s*\(Copenhagen’s worst trash drag\))', lambda match: match.group(0)+' (Copenhagen’s worst trash drag)', target, flags=re.I)
popup_danish={}
for source,copy in json.loads((folder/'popup-reviewed.json').read_text()).items():
 dictionary[copy['da']]=copy['en']
 if source!=copy['da']:popup_danish[source]=copy['da']
(root/'assets/site-language-data.js').write_text('// English copy for the current website. Generated from tools/i18n; reviewed copy takes precedence.\nwindow.DennisEnglish = '+json.dumps(dictionary,ensure_ascii=False,separators=(',',':'))+';\nwindow.DennisPopupDanish = '+json.dumps(popup_danish,ensure_ascii=False,separators=(',',':'))+';\n')
print('Built',len(dictionary),'translations; all',len(items),'source strings covered.')
