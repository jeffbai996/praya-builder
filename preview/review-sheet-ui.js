const byId=id=>document.getElementById(id);

function required(id){
  const node=byId(id);
  if(!node)throw Error(`Review-sheet UI is missing #${id}`);
  return node;
}

const HASH=/^[a-f0-9]{64}$/;
function manifestIndex(index){
  let url;try{url=new URL(index,location.href);}catch{throw Error('Review sheet has no readable manifest');}
  const match=url.pathname.match(/^\/api\/workspace\/artifacts\/([a-f0-9]{64})\/sheet\/index\.json$/);
  const review=url.searchParams.get('review');
  if(url.origin!==location.origin||!match||!HASH.test(review||'')||[...url.searchParams.keys()].length!==1)throw Error('Review sheet has no readable manifest');
  return {route:url.pathname.slice('/api/workspace/'.length)+url.search,artifactHash:match[1],reviewHash:review};
}

function validateManifest(manifest){
  if(!manifest||!HASH.test(manifest.artifactHash||'')||!HASH.test(manifest.reviewHash||'')||!Array.isArray(manifest.views))throw Error('Review sheet returned an invalid manifest');
  const base=`/api/workspace/artifacts/${manifest.artifactHash}/sheet/`;
  for(const view of manifest.views.flatMap(v=>v.dark?[v,v.dark]:[v])){
    let url;try{url=new URL(view?.url,location.href);}catch{throw Error('Review sheet contains an invalid image');}
    const file=url.pathname.slice(base.length);
    if(url.origin!==location.origin||!url.pathname.startsWith(base)||!/^[a-z0-9-]+\.png$/.test(file)||url.searchParams.get('review')!==manifest.reviewHash||[...url.searchParams.keys()].length!==1)throw Error('Review sheet contains an invalid image');
  }
}

function caption(view){
  const count=Number.isInteger(view.diagnosticCount)?view.diagnosticCount:0;
  return `${view.label||view.id}${count?` · ${count} diagnostic${count===1?'':'s'}`:''}`;
}

export function createReviewSheetUI({api,openImage}){
  if(typeof api!=='function'||typeof openImage!=='function')throw Error('Review-sheet UI requires api and openImage callbacks');
  const tabs=[...required('sheet-tabs').querySelectorAll('[data-sheet-tab]')];
  const panels={summary:required('sheet-summary'),review:required('sheet-review')};
  const status=required('sheet-status'),retry=required('sheet-retry'),gallery=required('sheet-gallery');
  if(tabs.length!==2)throw Error('Review-sheet UI requires summary and review tabs');

  const themedImages=new Set();
  const dark=()=>['dark','oled'].includes(document.documentElement.dataset.theme);
  new MutationObserver(()=>{for(const update of themedImages)update();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  let source=null,requestToken=0,retryWork=null,loadedKey=null;
  const selected=()=>tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.dataset.sheetTab||'summary';

  function setStatus(message,{failed=false}={}){
    status.textContent=message;
    status.dataset.tone=failed?'error':'neutral';
    retry.hidden=!failed;
  }

  function clear(message){
    themedImages.clear();gallery.replaceChildren();
    loadedKey=null;
    retryWork=null;
    setStatus(message);
  }

  function show(manifest,key){
    validateManifest(manifest);
    themedImages.clear();
    const figures=manifest.views.map(view=>{
      if(!view||typeof view.url!=='string')throw Error('Review sheet contains an invalid image');
      const label=caption(view),figure=document.createElement('figure'),link=document.createElement('a');
      const image=document.createElement('img'),text=document.createElement('figcaption');
      link.href=view.url;link.setAttribute('aria-label',`Open ${label}`);
      const update=()=>{const url=dark()&&view.dark?view.dark.url:view.url;image.src=url;link.href=url;};themedImages.add(update);update();image.alt=label;image.loading='lazy';image.decoding='async';
      text.textContent=label;link.append(image);figure.append(link,text);
      link.addEventListener('click',event=>{event.preventDefault();openImage(link.href,label);});
      return figure;
    });
    gallery.replaceChildren(...figures);loadedKey=key;retryWork=null;
    setStatus(figures.length?`${figures.length} review sheet${figures.length===1?'':'s'} · ${manifest.diagnosticsSource==='saved-snapshot'?'saved diagnostic record':'current diagnostic rules'}`:'No review sheets were produced.');
  }

  async function run(key,work){
    if(loadedKey===key)return;
    const token=++requestToken;retryWork=work;gallery.replaceChildren();retry.hidden=true;
    setStatus('Preparing review sheets…');
    try{
      const manifest=await work();
      if(token!==requestToken)return;
      show(manifest,key);
    }catch(error){
      if(token!==requestToken)return;
      const message=error?.message||'Review sheets could not be loaded';
      setStatus(message,{failed:true});
    }
  }

  function loadDraft(){
    if(source?.kind!=='draft')return;
    const {id,key,hash}=source;
    return run(key,async()=>{
      const context=await api(`drafts/${id}/context`);
      if(source?.key!==key)throw Object.assign(Error('Stale review request'),{stale:true});
      const index=manifestIndex(context?.sheet?.index);
      if(hash&&index.artifactHash!==hash)throw Error('Review sheet does not match this design');
      const manifest=await api(index.route);
      if(manifest?.artifactHash!==index.artifactHash||manifest?.reviewHash!==index.reviewHash)throw Error('Review sheet identity changed while loading');
      return manifest;
    });
  }

  function select(name,{focus=false}={}){
    if(!panels[name])return;
    for(const tab of tabs){const active=tab.dataset.sheetTab===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}
    for(const [id,panel] of Object.entries(panels))panel.hidden=id!==name;
    if(name==='review')loadDraft();
  }

  for(const tab of tabs){
    tab.type='button';
    tab.addEventListener('click',()=>select(tab.dataset.sheetTab));
    tab.addEventListener('keydown',event=>{
      const current=tabs.indexOf(tab);let next=null;
      if(event.key==='ArrowRight')next=(current+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(current-1+tabs.length)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      if(next!==null){event.preventDefault();select(tabs[next].dataset.sheetTab,{focus:true});}
    });
  }
  retry.type='button';
  retry.addEventListener('click',()=>{if(!retryWork)return;loadedKey=null;const work=retryWork,key=source?.key||'retry';run(key,work);});

  function setDraft(draft){
    if(!draft){requestToken++;source=null;clear('Open a design to review its elevations and floors.');return;}
    const hash=draft.candidate?.hash||'';
    const key=`draft:${draft.id}:${hash}:${draft.version??''}`;
    if(source?.key===key)return;
    requestToken++;
    source={kind:'draft',id:draft.id,hash,key};
    clear('Review sheets are ready when you open this tab.');
    if(selected()==='review')loadDraft();
  }

  function showRevision(id){
    if(typeof id!=='string'||!id)throw Error('A saved version is required');
    requestToken++;const key=`revision:${id}`;source={kind:'revision',id,key};
    clear('Preparing saved-version review sheets…');select('review');
    return run(key,()=>api(`revisions/${id}/sheet`));
  }

  select(selected());
  return {setDraft,showRevision};
}
