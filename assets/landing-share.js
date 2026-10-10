// Share the public canonical page URL, including from an embedded exhibition.
(() => {
  const url=document.querySelector('link[rel="canonical"]')?.href;
  if(!url)return;
  let row=document.querySelector('body > header');
  if(!row){
    const back=document.querySelector('main > a.back');
    if(!back)return;
    row=document.createElement('div');row.className='landing-share-row';
    back.before(row);row.append(back);
  }
  const wrap=document.createElement('div');wrap.className='landing-share';
  const button=document.createElement('button');button.type='button';button.className='landing-share-toggle';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v5C6 8 3 12 3 20c3-5 6-7 11-7v5l8-7z"/></svg><span>DEL</span>';
  button.setAttribute('aria-label','Del denne side');button.setAttribute('aria-expanded','false');
  const panel=document.createElement('div');panel.className='landing-share-panel';panel.hidden=true;
  const copy=document.createElement('button');copy.type='button';copy.textContent='Kopiér link';
  const status=document.createElement('p');status.className='landing-share-status';status.setAttribute('role','status');
  copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(url);status.textContent='Linket er kopieret';}
    catch{
      let input=panel.querySelector('input');
      if(!input){input=document.createElement('input');input.readOnly=true;input.value=url;input.setAttribute('aria-label','Link til siden');panel.prepend(input);}
      input.focus();input.select();status.textContent='Kopiér det markerede link';
    }
  });
  panel.append(copy);
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){
    const native=document.createElement('button');native.type='button';native.textContent='Del via …';
    native.addEventListener('click',async()=>{try{await navigator.share({title:document.querySelector('h1')?.textContent,url});}catch{}});
    panel.append(native);
  }
  panel.append(status);wrap.append(button,panel);row.append(wrap);
  const back=row.querySelector('a');
  const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='landing-close';
  closeButton.setAttribute('aria-label','Luk siden og gå tilbage');
  closeButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  closeButton.addEventListener('click',()=>back?.click());row.append(closeButton);
  closeButton.dataset.input='pointer';
  closeButton.addEventListener('pointerdown',()=>{closeButton.dataset.input='pointer';});
  document.addEventListener('keydown',event=>{if(event.key==='Tab')closeButton.dataset.input='keyboard';},true);
  const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');};
  wrap.dataset.input='pointer';
  wrap.addEventListener('pointerdown',()=>{wrap.dataset.input='pointer';});
  document.addEventListener('keydown',event=>{if(event.key==='Tab')wrap.dataset.input='keyboard';},true);
  button.addEventListener('click',event=>{const opening=panel.hidden;close();if(opening){status.textContent='';panel.hidden=false;button.setAttribute('aria-expanded','true');if(event.detail===0)copy.focus();}});
  document.addEventListener('pointerdown',event=>{if(!wrap.contains(event.target))close();},true);
  wrap.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopPropagation();close();button.focus();}});
})();
