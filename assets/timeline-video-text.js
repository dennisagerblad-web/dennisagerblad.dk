// Owner-reviewed text stays attached to its own video. English originals never enter translation.
export function appendReviewedVideoText(parent, segments = []) {
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
