// Owner-reviewed text stays attached to its own video. English originals never enter translation.
export function reviewedVideoBodySegments(segments = [], { standalone = false, popupTitle = '' } = {}) {
  if (!standalone) return segments;
  const first = segments.findIndex(part => part.text.trim());
  if (first < 0 || segments[first].type === 'lyrics') return segments;
  const normalizeTitle = text => String(text).normalize('NFKC').toLocaleLowerCase('da-DK').replace(/[^\p{L}\p{N}]/gu, '');
  const heading = segments[first];
  // A single video's title already belongs to the popup header. Collections
  // retain each video's heading; a lyric mentioning its title remains intact.
  if (heading.type !== 'heading' && normalizeTitle(heading.text) !== normalizeTitle(popupTitle)) return segments;
  const body = segments.slice(first + 1);
  while (body[0]?.type === 'space') body.shift();
  return body;
}

export function appendReviewedVideoText(parent, segments = [], options = {}) {
  segments = reviewedVideoBodySegments(segments, options);
  if (!segments.length) return;
  const copy=document.createElement('div');
  copy.className='tg-reviewed-copy'; copy.dataset.ownerVideoText='';
  segments.forEach((part,index)=>{
    const line=document.createElement('span');
    line.textContent=part.text;
    if(part.type==='heading')line.className='tg-video-text-heading';
    if(part.type==='lyrics' && part.language==='en') {
      line.lang='en';line.dataset.noTranslate='';line.dataset.originalLyrics='en';
    } else if(typeof part.english==='string')line.dataset.englishText=part.english;
    copy.append(line);
    if(index<segments.length-1)copy.append(document.createTextNode('\n'));
  });
  parent.append(copy);
}
