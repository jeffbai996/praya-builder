import {placementReadiness,compatibleSites,placementFit,placementErrorMessage} from './placement-readiness.js';
import {label,componentLabel,coordinates,setCoordinates,record,review,finishChoices,siteInterface} from './studio-interface.js';
import {createScene} from './scene.js';
import {readTheme,saveTheme,bindThemeToggle} from './review-state.js';
import {presets,compose} from './sign-presets.js';
import {versionThumbnail} from './version-thumbs.js';
import {createPartsUI} from './parts-ui.js';
import {createReviewSheetUI} from './review-sheet-ui.js';
import {renderSupport} from './support-list.js';
const $=id=>document.getElementById(id);
let scene,draft,site,index,projects=[],ticket=0,busy=false,changes=[],contextFloor=0,contextSurface=0,compareHash=null,bridge=null;
// Meshes are immutable per candidate hash, so floor switching after the first fetch needs no network round trip.
const meshCache=new Map();
async function draftMesh(d,ceiling){const key=d.candidate.hash+':'+ceiling;if(meshCache.has(key)){const mesh=meshCache.get(key);meshCache.delete(key);meshCache.set(key,mesh);return mesh;}const mesh=await api(`drafts/${d.id}/mesh?ceiling=${ceiling}`);meshCache.set(key,mesh);if(meshCache.size>8)meshCache.delete(meshCache.keys().next().value);return mesh;}
// Floors: walkable levels from spaces plus slab rows found by block density, cut two blocks above each level like the studies.
function floorOptions(candidate){
 const rows=new Map();for(const c of candidate.blocks)if(c.block!=='minecraft:air')rows.set(c.y,(rows.get(c.y)||0)+1);
 const count=y=>rows.get(y)||0,slabs=[];
 for(const y of [...rows.keys()].sort((a,b)=>a-b)){const near=[y-2,y-1,y+1,y+2].filter(v=>rows.has(v)).map(count);if(count(y)>=100&&near.length&&count(y)>=2*Math.min(...near))slabs.push(y);}
 const levels=new Set((candidate.spaces||[]).map(s=>s.min[1]));
 for(let i=0;i<slabs.length;i++){if(slabs[i+1]===slabs[i]+1)continue;levels.add(slabs[i]+1);}
 const sorted=[...levels].filter(y=>y>=0&&y<candidate.dimensions.y-2).sort((a,b)=>a-b).filter((y,i,all)=>i===0||y-all[i-1]>2);
 const names=['Ground floor','First floor','Second floor','Third floor','Fourth floor','Fifth floor','Sixth floor','Seventh floor'];
 return sorted.map((y,i)=>({value:y+2,label:i===sorted.length-1&&i>0&&y>=candidate.dimensions.y-8?'Roof level':names[i]||`Level ${i}`}));
}
const status=(message,tone='neutral')=>{$('studio-status').textContent=message;$('studio-status').dataset.tone=tone;if(tone==='error'||tone==='warning'){$('studio-alert-message').textContent=message;$('studio-alert-title').textContent=tone==='error'?'Action could not finish':'Action needs attention';$('studio-alert').hidden=false;requestAnimationFrame(()=>$('studio-alert').focus({preventScroll:true}));}};
$('dismiss-alert').onclick=()=>{$('studio-alert').hidden=true;};
const preferred=readTheme(),theme=['light','dark','oled'].includes(preferred)?preferred:'light';document.documentElement.dataset.theme=theme;
try{scene=createScene($('studio-model'));scene.theme(theme);}catch(error){status(error.message,'error');}
bindThemeToggle($('theme-toggle'),theme,value=>{document.documentElement.dataset.theme=value;saveTheme(value);scene?.theme(value);});
async function api(route,body){if(body&&/^drafts\/[a-z0-9-]+\/edit$/.test(route)&&body.author===undefined)body={...body,author:STUDIO_AUTHOR};const response=await fetch('/api/workspace/'+route,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-Builder-Write':'1'},body:body===undefined?undefined:JSON.stringify(body)});let data;try{data=await response.json();}catch{data={error:response.ok?'Unexpected response':'Connection failed ('+response.status+')'};}if(!response.ok){const error=Error(data.error||'Workspace request failed');error.status=response.status;throw error;}return data;}
const sheetUI=createReviewSheetUI({api,openImage:(url,label)=>{const dialog=$('reference-dialog');dialog.querySelector('img').src=url;dialog.querySelector('img').alt=label;$('reference-caption').textContent=label;dialog.showModal();}});
const partsUI=createPartsUI({container:$('part-tools'),api,onChange:()=>materials(),apply:async part=>{let applied;await action(async()=>{const d=requireDraft();applied=await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,part});await renderDraft(applied);});if(!applied)throw Error('Part was not applied; check the workspace alert.');if(!applied.valid)throw Error('The candidate needs changes; see its diagnostics.');}});
async function action(work){if(busy)return;busy=true;document.body.dataset.busy='true';updatePlacement();try{await work();}catch(error){if(error.status===409&&draft)conflict(error);else status(placementErrorMessage(error.message),'error');}finally{busy=false;document.body.dataset.busy='false';updatePlacement();}}
// A 409 means the draft moved under us. Keep the camera and cutaway; let the user reload the draft on their terms.
function conflict(error){status('This action conflicts with a newer saved version. Your current design is kept. '+error.message,'warning');const box=$('studio-status');box.dataset.tone='warning';box.textContent='This design changed elsewhere; your view is kept. ';const actions=document.createElement('span');actions.className='conflict-actions';const reload=document.createElement('button');reload.type='button';reload.textContent='Reload design';reload.onclick=()=>action(async()=>{await refresh();await renderDraft(await api('drafts/'+draft.id));status('Design reloaded.');});const detail=document.createElement('button');detail.type='button';detail.textContent='Details';detail.onclick=()=>{status(error.message,'error');};actions.append(reload,detail);box.append(actions);}
function download(value,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const when=iso=>new Date(iso).toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
// Modes: Design is the default; Site and Construction reveal their own column beside the same model.
function mode(name,{scroll=false}={}){
 if(!['design','site','construction'].includes(name))name='design';
 $('studio-main').dataset.mode=name;
 for(const panel of document.querySelectorAll('.mode-panel'))panel.hidden=panel.dataset.for!==name;
 for(const link of document.querySelectorAll('.studio-steps a')){if(link.dataset.mode===name)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 // Scroll after layout settles: the column beside the model changes height when panels swap.
 if(scroll)requestAnimationFrame(()=>$({design:'design-workspace',site:'site-workspace',construction:'place-workspace'}[name])?.scrollIntoView({block:'start'}));
}
const modeFromHash=hash=>({'#site-workspace':'site','#proposal-workspace':'site','#place-workspace':'construction','#revise-workspace':'design','#versions-workspace':'design','#request-workspace':'design'}[hash]||'design');
for(const link of document.querySelectorAll('.studio-steps a'))link.addEventListener('click',event=>{event.preventDefault();history.replaceState(null,'',link.getAttribute('href'));mode(link.dataset.mode,{scroll:true});});
window.addEventListener('hashchange',()=>mode(modeFromHash(location.hash)));
$('empty-site').onclick=()=>{mode('site',{scroll:innerWidth<1024});$('site-select').focus();};
const designName=name=>name.replace(/ · (?:R\d+|Praya detail pass)$/,'');
let showAllDrafts=false;
function designChoices(){
 const byId=new Map(index.drafts.map(d=>[d.id,d])),seen=new Set();
 const ordered=[...[...index.revisions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=>byId.get(r.draftId)).filter(Boolean),...index.drafts];
 return ordered.filter(d=>{if(seen.has(d.project))return false;seen.add(d.project);return true;}).sort((a,b)=>designName(a.name).localeCompare(designName(b.name)));
}
const STUDIO_AUTHOR={agent:'studio',model:'operator'};
function modelName(id){if(!id)return '';const known={'claude-fable-5-1':'Claude Fable 5.1','claude-opus-5':'Claude Opus 5','claude-sonnet-5':'Claude Sonnet 5','claude-haiku-4-5':'Claude Haiku 4.5','operator':'Operator','unrecorded':'Unrecorded'};if(known[id])return known[id];
 return id.split(/[-_]/).map(p=>/^\d+$/.test(p)?p:p[0].toUpperCase()+p.slice(1)).join(' ').replace(/(\d) (\d)/g,'$1.$2');}
function authorLabel(a){if(!a)return 'Unrecorded';return [modelName(a.model||a.agent),a.effort].filter(Boolean).join(' · ');}
function authorTag(d){return d.author?' · '+authorLabel(d.author):'';}
function authorChip(a){const chip=$('draft-author');if(!chip)return;chip.hidden=!a;chip.textContent=a?authorLabel(a):'';chip.dataset.agent=a?.agent||'';}
function renderDesignChoices(current=$('draft-select').value){
 const select=$('draft-select'),latest=designChoices();select.replaceChildren(new Option('Choose a design',''));
 for(const d of latest)select.add(new Option(designName(d.name)+(d.valid?'':' · needs changes'),d.id));
 const rest=index.drafts.filter(d=>!latest.some(n=>n.id===d.id));
 if(showAllDrafts){const group=document.createElement('optgroup');group.label='Earlier versions and working drafts';
  for(const d of rest.sort((a,b)=>a.name.localeCompare(b.name)))group.append(new Option(d.name+(d.valid?'':' · needs changes'),d.id));select.append(group);
 }else if(current&&!latest.some(d=>d.id===current)){
  const d=index.drafts.find(d=>d.id===current);if(d)select.add(new Option(d.name+' · currently open',d.id));
 }
 select.value=current;$('draft-history').hidden=!rest.length;$('draft-history').textContent=showAllDrafts?'Show current designs':'Show all drafts';$('draft-history').setAttribute('aria-expanded',String(showAllDrafts));
}
$('draft-history').onclick=()=>{showAllDrafts=!showAllDrafts;renderDesignChoices();};
async function refresh(){index=await api('context');$('studio-main').hidden=false;if(!index.sites.length)$('fixture-panel').open=true;const sid=$('site-select').value,did=$('draft-select').value;$('site-select').replaceChildren(new Option('No site selected',''),...index.sites.map(s=>new Option(s.name,s.id)));$('site-select').value=sid;renderDesignChoices(did);$('saved-revision').replaceChildren(...index.revisions.map(r=>new Option(r.plan.name+' · '+when(r.createdAt),r.id)));$('continue-revision').disabled=!index.revisions.length;$('job-select').replaceChildren(new Option('Choose a construction job',''),...(index.jobs||[]).map(j=>new Option(label(j.kind)+' · '+label(j.state)+' · '+when(j.createdAt),j.id)));status(`${index.sites.length} sites · ${designChoices().length} designs · ${index.revisions.length} saved versions`);}
async function selectSite(id){site=id?await api('sites/'+id):null;$('site-select').value=id||'';scene.siteBounds(site);const templateFits=Boolean(site&&site.plot.max[0]-site.plot.min[0]>=32&&site.plot.max[2]-site.plot.min[2]>=32);$('new-proposals').disabled=!templateFits;$('study-site-note').hidden=!site||templateFits;for(const id of ['context-visible','context-depth','impact-visible']){$(id).disabled=!site;$(id).closest('.layer-chip').title=site?'':'Needs a surveyed site';}if(site){await loadSiteView();setCoordinates('origin',site.plot.min);$('site-summary').textContent=`${site.plot.max[0]-site.plot.min[0]} × ${site.plot.max[2]-site.plot.min[2]} plot · ${site.world} · captured ${when(site.capturedAt)}${site.protected.length?' · '+site.protected.length+' protected areas':''}`;}else{await scene.loadContext({sections:[]});$('site-summary').textContent='No site. Designs still work without one; construction needs a survey.';}}
async function loadSiteView(){if(!site)return;const mesh=await api(`sites/${site.id}/mesh?depth=${$('context-depth').checked?'full':'surface'}`);contextFloor=mesh.floor;contextSurface=mesh.surfaceY;scene.siteBounds({...site,plot:$('context-depth').checked?site.plot:{min:[site.plot.min[0],site.frontage[1]+.05,site.plot.min[2]],max:[site.plot.max[0],site.frontage[1]+.15,site.plot.max[2]]}});await scene.loadContext(mesh);scene.frame(site.dimensions,contextSurface);scene.fit(site.blocks.filter(c=>c.y>=contextFloor));cameraSelection(null);}
$('context-depth').onchange=()=>action(loadSiteView);
function localCells(cells){const offset=site?draft.transform.origin.map((v,i)=>v-site.origin[i]):[0,0,0];return cells.map(c=>{let {x,z}=c,w=draft.candidate.dimensions.x,d=draft.candidate.dimensions.z;for(let i=0;i<(draft.transform?.turns||0);i++){[x,z]=[d-1-z,x];[w,d]=[d,w];}return {...c,x:x+offset[0],y:c.y+offset[1],z:z+offset[2]};});}
function highlight(){const id=$('studio-component').value;scene.select(id?localCells(draft.candidate.blocks.filter(c=>c.component===id)):[]);const overlays=$('diff-visible').checked?localCells(changes):[];if($('impact-visible').checked&&site&&draft.assessment)for(const [cells,kind]of [[draft.assessment.collisions,'change'],[draft.assessment.excavations,'remove']])for(const c of cells)overlays.push({...c,x:c.x-site.origin[0],y:c.y-site.origin[1],z:c.z-site.origin[2],kind});scene.differences(overlays);}
// Versions: saved artifacts of this draft's project, oldest first, numbered for people.
const versions=()=>index.revisions.filter(r=>r.project===draft.project).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map((r,i)=>({...r,number:i+1}));
// Stored thumbnails are served with the revision; a missing one is rendered here once and sent back for every other device.
const rendering=new Set();
function thumbnail(revision){
 const box=document.createElement('span');box.className='version-thumb';box.textContent='V'+revision.number;
 const img=document.createElement('img');img.className='version-thumb';img.alt='';img.loading='lazy';img.src=`/api/workspace/revisions/${revision.id}/thumbnail`;
 img.onerror=async()=>{img.replaceWith(box);if(rendering.has(revision.id))return;rendering.add(revision.id);try{const image=await versionThumbnail(revision.artifactHash,{background:getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()||'#e8e8e6'});await api(`revisions/${revision.id}/thumbnail`,{image});img.onerror=null;img.src=image;box.replaceWith(img);}catch{/* The V-number tile stays; nothing else depends on the picture. */}finally{rendering.delete(revision.id);}};
 return img;
}
function renderVersions(){
 const list=versions(),current=list.filter(r=>r.artifactHash===draft.candidate.hash).at(-1),latest=list.at(-1);
 const state=$('save-state');state.hidden=false;
 if(current){state.dataset.state='saved';state.textContent='Saved as version '+current.number+' · '+when(current.createdAt);}
 else if(latest){state.dataset.state='unsaved';state.textContent='Unsaved changes since version '+latest.number;}
 else{state.dataset.state='never';state.textContent='Not saved yet';}
 $('version-state').textContent=list.length?`${list.length} saved version${list.length===1?'':'s'}. Opening a version creates a new draft.`:'No saved versions yet. Save version keeps this exact building.';
 $('version-list').replaceChildren(...list.slice().reverse().map(r=>{const li=document.createElement('li');li.dataset.current=String(r.artifactHash===draft.candidate.hash);const text=document.createElement('div');const name=document.createElement('strong');name.textContent='Version '+r.number;if(r.artifactHash===draft.candidate.hash){const tag=document.createElement('em');tag.className='version-tag';tag.textContent='current';name.append(tag);}const time=document.createElement('span');time.textContent=new Date(r.createdAt).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+authorTag(r);text.append(name,time);const actions=document.createElement('div');actions.className='inline-actions';const compare=document.createElement('button');compare.type='button';compare.textContent='Compare';compare.disabled=r.artifactHash===draft.candidate.hash;compare.onclick=()=>{$('compare-select').value=r.artifactHash;$('diff-visible').checked=true;action(loadChanges);};const open=document.createElement('button');open.type='button';open.textContent='Open';open.title='Start a new draft from this version';open.onclick=()=>action(()=>continueRevision(r));const sheets=document.createElement('button');sheets.type='button';sheets.textContent='Review';sheets.onclick=()=>{sheetUI.showRevision(r.id);$('sheet-tabs').scrollIntoView({block:'nearest'});};actions.append(sheets,compare,open);li.append(thumbnail(r),text,actions);return li;}));
 const previous=list.filter(r=>r.artifactHash!==draft.candidate.hash),choice=$('compare-select');
 choice.replaceChildren(new Option('Original draft',''),...previous.map(r=>new Option('Version '+r.number+' · '+when(r.createdAt),r.artifactHash)));
 if(compareHash===null||![...choice.options].some(o=>o.value===compareHash))compareHash=previous.at(-1)?.artifactHash||'';choice.value=compareHash;
}
async function loadChanges(){if(!draft)return;compareHash=$('compare-select').value;changes=await api(`drafts/${draft.id}/diff${compareHash?'?baseline='+compareHash:''}`);const count=kind=>changes.filter(c=>c.kind===kind).length;const against=$('compare-select').selectedOptions[0]?.textContent.split(' · ')[0]||'original draft';$('compare-summary').textContent=changes.length?`Versus ${against}: ${count('add')} added · ${count('change')} changed · ${count('remove')} removed. Turn on Changes to see them on the model.`:`No differences from ${against}.`;highlight();}
$('compare-select').onchange=()=>action(loadChanges);
function selection(text,material,raw){const box=$('studio-selection');box.replaceChildren();if(!text){box.textContent='Click a block to see which component it belongs to.';return;}const name=document.createElement('b');name.textContent=text;box.append(name);if(material)box.append(' · '+material);if(raw){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Details';const code=document.createElement('code');code.textContent=raw;details.append(summary,' ',code);box.append(details);}}
function backLink(){const link=$('back-link');link.href='/?panel=register';link.title=link.ariaLabel='Design library';}
async function renderDraft(next,{frame=false}={}){
 const token=++ticket;
 const ceiling=$('studio-ceiling');const wanted=ceiling.value,floors=floorOptions(next.candidate);ceiling.replaceChildren(new Option('Whole building','64'),...floors.map(f=>new Option(f.label,String(f.value))));ceiling.value=[...ceiling.options].some(o=>o.value===wanted)?wanted:'64';
 const mesh=await draftMesh(next,ceiling.value);if(token!==ticket)return;
 if(next.siteId!==site?.id){await selectSite(next.siteId);frame=true;}if(token!==ticket)return;
 if(!draft||draft.candidate.dimensions.x!==next.candidate.dimensions.x||draft.candidate.dimensions.z!==next.candidate.dimensions.z)frame=true;
 if(draft&&(draft.id!==next.id||draft.candidate.hash!==next.candidate.hash))clearPlacementJob();draft=next;await scene.load(mesh);if(token!==ticket)return;
 scene.position(site?draft.transform.origin.map((v,i)=>v-site.origin[i]):[0,0,0]);scene.show();
 if(frame)scene.frame(site?.dimensions||draft.candidate.dimensions,site?contextSurface:0);
 renderDesignChoices(draft.id);$('draft-title').textContent=designName(draft.plan.name);authorChip(draft.author);$('rename-design').hidden=false;$('rename-form').hidden=true;
 const selected=$('studio-component').value;$('studio-component').replaceChildren(new Option('Whole building',''),...draft.plan.components.map(c=>new Option(componentLabel(c.id),c.id)));$('studio-component').value=selected;
 partsUI.setDraft(draft);materials();renderVersions();await loadChanges();
 $('candidate-state').textContent=draft.valid?'Ready to review':'Needs changes';$('candidate-state').dataset.state=draft.valid?'valid':'invalid';
 $('candidate-summary').textContent=`${draft.candidate.blocks.length.toLocaleString()} cells · ${changes.length.toLocaleString()} changes from the compared version · draft version ${draft.version} · ${draft.candidate.hash.slice(0,12)}`;
 review(draft);support();references();sheetUI.setDraft(draft);
 $('save-revision').disabled=!draft.valid;$('undo-draft').disabled=draft.cursor===0;$('redo-draft').disabled=draft.cursor===draft.history.length-1;
 draftControls(true);backLink();document.body.dataset.draft=draft.id;document.body.dataset.ready='true';
 const url=new URL(location.href);url.searchParams.set('draft',draft.id);url.searchParams.delete('catalogue');history.replaceState(null,'',url);
}
async function support(){
 const rows=await api(`drafts/${draft.id}/support${bridge?.connected&&bridge.capabilities?.signData===1?'?signData=1':''}`);
 renderSupport($('asset-support'),rows);
}
// Signs owned by the selected component; plan and candidate share coordinates, so ownership comes from the compiled cells.
function componentSigns(){
 if(!draft?.plan.signs?.length)return [];const id=$('studio-component').value;
 const owner=new Map(draft.candidate.blocks.map(c=>[`${c.x},${c.y},${c.z}`,c.component]));
 return draft.plan.signs.map((sign,i)=>({...sign,index:i,component:owner.get(sign.at.join(','))})).filter(s=>!id||s.component===id);
}
function signTools(){
 const signs=componentSigns();$('sign-tools').hidden=!signs.length;if(!signs.length)return;
 const chosen=$('sign-select').value;$('sign-select').replaceChildren(...signs.map(s=>new Option(`${componentLabel(s.component)} · (${s.at.join(', ')}) · ${s.lines.find(l=>l.trim())||'blank'}`,String(s.index))));
 $('sign-select').value=signs.some(s=>String(s.index)===chosen)?chosen:String(signs[0].index);
 if(!$('sign-preset').options.length)$('sign-preset').replaceChildren(...presets.map(p=>new Option(p.name,p.id)));
 signFields(true);
}
function signFields(fromSign){
 const preset=presets.find(p=>p.id===$('sign-preset').value)||presets[0],sign=draft.plan.signs[Number($('sign-select').value)];
 $('sign-hint').textContent=preset.hint||'Edit the four lines directly.';
 const current=Object.fromEntries([...$('sign-fields').querySelectorAll('[data-key]')].map(e=>[e.dataset.key,e.value]));
 $('sign-fields').replaceChildren(...preset.fields.map((f,i)=>{const label=document.createElement('label');label.textContent=f.label;const id='sign-field-'+f.key;label.htmlFor=id;let input;if(f.options){input=document.createElement('select');input.replaceChildren(...f.options.map(([v,n])=>new Option(n,v)));}else{input=document.createElement('input');input.maxLength=24;input.value=fromSign&&preset.id==='custom'?sign.lines[i]||'':current[f.key]||'';}input.id=id;input.dataset.key=f.key;input.addEventListener('input',signPreview);input.addEventListener('change',signPreview);return [label,input];}).flat());
 signPreview();
}
function signComposition(){const fields=Object.fromEntries([...$('sign-fields').querySelectorAll('[data-key]')].map(e=>[e.dataset.key,e.value]));return compose($('sign-preset').value,fields);}
function signPreview(){const {lines,empty}=signComposition();$('sign-preview').textContent=lines.map(l=>l||' ').join('\n');$('apply-sign').disabled=empty||!draft;}
$('sign-select').onchange=()=>{$('sign-preset').value='custom';signFields(true);};
$('sign-preset').onchange=()=>signFields(false);
$('apply-sign').onclick=()=>action(async()=>{const d=requireDraft(),{lines,empty}=signComposition();if(empty)throw Error('Type the sign text first');const signs=d.plan.signs.map((s,i)=>i===Number($('sign-select').value)?{...s,lines}:s);status('Compiling sign text…');await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,plan:{...d.plan,signs}}));status('Sign text updated. Camera kept.');});
// References: images and notes kept with the draft and listed in the revision request by hash.
async function references(){
 if(!draft){$('reference-list').replaceChildren();return;}
 const list=await api(`drafts/${draft.id}/references`);
 $('reference-list').replaceChildren(...list.map(entry=>{const figure=document.createElement('figure'),open=document.createElement('button'),img=document.createElement('img'),caption=document.createElement('figcaption'),remove=document.createElement('button');open.type='button';open.className='reference-open';open.title=entry.note||entry.name;img.src=`/api/workspace/references/${draft.id}/${entry.id}`;img.alt=entry.name;img.loading='lazy';open.append(img);open.onclick=()=>{$('reference-image').src=img.src;$('reference-image').alt=entry.name;$('reference-caption').textContent=entry.name+(entry.note?' · '+entry.note:'');$('reference-dialog').showModal();};caption.textContent=entry.name;remove.type='button';remove.className='reference-remove';remove.textContent='Remove';remove.onclick=()=>action(async()=>{await api(`drafts/${draft.id}/references/${entry.id}/remove`,{});await references();status('Reference removed.');});figure.append(open,caption,remove);return figure;}));
 $('add-references').disabled=false;
}
$('reference-close').onclick=()=>$('reference-dialog').close();
$('add-references').onclick=()=>action(async()=>{const d=requireDraft(),files=[...$('reference-files').files];if(!files.length)throw Error('Choose one or more PNG or JPEG files');for(const file of files){if(file.size>8*1024*1024)throw Error(file.name+' exceeds 8 MiB');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));await api(`drafts/${d.id}/references`,{name:file.name,type:file.type,data:btoa(binary),note:$('reference-note').value});}$('reference-files').value='';$('reference-note').value='';await references();status(files.length+' reference'+(files.length===1?'':'s')+' added.');});
function materials(){
 if(!draft)return;const id=$('studio-component').value,selected=$('material-role').value,roles=new Set();
 const collect=ops=>{for(const role of partsUI.roles(ops))if(role!=='air')roles.add(role);};
 for(const c of draft.plan.components)if(!id||c.id===id)collect(c.operations);
 $('material-role').replaceChildren(...[...roles].sort().map(k=>new Option(label(k),k)));
 if(roles.has(selected))$('material-role').value=selected;
 $('material-state').value=draft.plan.palette[$('material-role').value]||'';finishChoices($('material-state').value);
 $('roof-variant-controls').hidden=!/^study-(bar|staggered|court)$/.test(draft.plan.plan_id)||!/^wing-[01]-roof$/.test(id);
 signTools();
}
const requireDraft=()=>{if(!draft)throw Error('Open a design first');return draft;};
function placement(){const origin=coordinates('origin');return {siteId:site?.id,transform:{origin,turns:Number($('turns').value)},brief:$('brief').value};}
async function chooseSite(id){await selectSite(id);clearPlacementJob();draft=null;sheetUI.setDraft(null);partsUI.setDraft(null);$('draft-select').value='';delete document.body.dataset.draft;document.body.dataset.ready='false';scene.hide();draftControls(false);$('candidate-state').textContent='No design';delete $('candidate-state').dataset.state;$('candidate-summary').textContent='';$('asset-support').replaceChildren();$('sign-tools').hidden=true;$('reference-list').replaceChildren();$('add-references').disabled=true;$('review-metrics').replaceChildren();$('diagnostics').replaceChildren();$('draft-title').textContent=site?'Choose a design for this site':'No design open';authorChip(null);$('rename-design').hidden=true;$('rename-form').hidden=true;$('save-state').hidden=true;$('version-list').replaceChildren();$('compare-summary').textContent='';selection();backLink();const url=new URL(location.href);url.searchParams.delete('draft');if(id)url.searchParams.set('site',id);else url.searchParams.delete('site');history.replaceState(null,'',url);}
async function continueRevision(r){const d=await api('drafts',{plan:r.plan,parentHash:r.artifactHash,siteId:r.siteId,transform:r.transform,brief:r.brief,author:STUDIO_AUTHOR});await refresh();await renderDraft(d,{frame:true});mode('design');status('New draft opened from the saved version; the saved version is unchanged.');}
$('rename-design').onclick=()=>{$('rename-input').value=draft.plan.name;$('rename-form').hidden=false;$('rename-design').hidden=true;$('rename-input').focus();$('rename-input').select();};
$('rename-cancel').onclick=()=>{$('rename-form').hidden=true;$('rename-design').hidden=!draft;};
$('rename-form').onsubmit=e=>{e.preventDefault();action(async()=>{const d=requireDraft(),name=$('rename-input').value.trim();if(!name)throw Error('Enter a name');if(name===d.plan.name){$('rename-cancel').onclick();return;}status('Renaming…');await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,plan:{...d.plan,name}}));await refresh();$('rename-form').hidden=true;$('rename-design').hidden=false;status('Renamed to '+name+'. Versions and identity unchanged.');});};
$('site-select').onchange=()=>action(()=>chooseSite($('site-select').value));
$('draft-select').onchange=()=>action(async()=>{if($('draft-select').value)await renderDraft(await api('drafts/'+$('draft-select').value));});
for(const kind of ['flat','slope'])$('fixture-'+kind).onclick=()=>action(async()=>{const saved=await api('fixtures',{kind});await refresh();await chooseSite(saved.id);status('Synthetic '+kind+' test plot ready.');});
$('catalogue-draft').onclick=()=>action(async()=>{const d=await api('drafts',{...placement(),author:STUDIO_AUTHOR,catalogue:$('catalogue-select').value});await refresh();await renderDraft(d,{frame:true});mode('design');});
$('import-plan').onclick=()=>action(async()=>{const file=$('plan-file').files[0];if(!file)throw Error('Choose a plan JSON file');const d=await api('drafts',{...placement(),author:{agent:'studio upload',model:'unrecorded'},plan:JSON.parse(await file.text())});await refresh();await renderDraft(d,{frame:true});mode('design');});
$('continue-revision').onclick=()=>action(async()=>{const r=index.revisions.find(r=>r.id===$('saved-revision').value);if(!r)throw Error('Choose a saved version');await continueRevision(r);});
$('new-proposals').onclick=()=>action(async()=>{if(!site)throw Error('Select a site first');status('Compiling three apartment studies…');const result=await api('proposals',{siteId:site.id});await refresh();await renderDraft(result[0],{frame:true});mode('design');status('Three alternatives created. Switch designs to compare them.');});
$('apply-material').onclick=()=>action(async()=>{const d=requireDraft();status('Compiling…');await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,componentId:$('studio-component').value||undefined,palette:{[$('material-role').value]:$('material-state').value}}));status('Updated. Camera kept.');});
for(const direction of ['undo','redo'])$(direction+'-draft').onclick=()=>action(async()=>{const d=requireDraft();await renderDraft(await api(`drafts/${d.id}/history`,{expectedVersion:d.version,direction}));});
$('save-revision').onclick=()=>action(async()=>{const d=requireDraft(),saved=await api(`drafts/${d.id}/save`,{expectedVersion:d.version,candidateHash:d.candidate.hash,idempotencyKey:'save-'+d.version+'-'+d.candidate.hash});await refresh();renderVersions();status('Saved version of '+saved.plan.name+'.');});
$('prepare-request').onclick=()=>action(async()=>{const d=requireDraft(),request=await api(`drafts/${d.id}/request`,{expectedVersion:d.version,componentId:$('studio-component').value,instruction:$('revision-instruction').value});download({request,context:await api(`drafts/${d.id}/context`),references:(await api(`drafts/${d.id}/references`)).map(r=>({name:r.name,note:r.note,type:r.type,bytes:r.bytes,sha256:r.sha256,path:`references/${d.id}/${r.file}`}))},'design-request.json');status('Request file downloaded. Give it to your design agent, then import the revised plan.');});
$('submit-revision').onclick=()=>action(async()=>{const d=requireDraft(),file=$('revision-file').files[0];if(!file)throw Error('Choose the revised plan JSON');await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,author:{agent:'studio upload',model:'unrecorded'},plan:JSON.parse(await file.text())}));});
$('download-plan').onclick=()=>action(async()=>download(requireDraft().plan,'proposal.plan.json'));
$('download-schematic').onclick=()=>action(async()=>{const d=requireDraft(),a=document.createElement('a');a.href=`/api/workspace/drafts/${d.id}/schematic`;a.download='proposal.schem';a.click();});
$('apply-variant').onclick=()=>action(async()=>{const d=requireDraft();await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,componentId:$('studio-component').value,variant:{name:'roof-canopy',value:$('roof-variant').value}}));});
$('material-role').onchange=()=>{$('material-state').value=draft.plan.palette[$('material-role').value];finishChoices($('material-state').value);};
$('studio-component').onchange=()=>{if(draft){materials();highlight();const id=$('studio-component').value;selection(id?componentLabel(id):null);}};$('diff-visible').onchange=()=>{if(draft)highlight();};$('impact-visible').onchange=()=>{if(draft)highlight();};$('context-visible').onchange=()=>scene.contextVisible($('context-visible').checked);
$('studio-ceiling').onchange=()=>action(async()=>{if(draft)await renderDraft(draft);});
$('studio-navigation').onchange=()=>{scene.navigation($('studio-navigation').value);$('studio-model').focus({preventScroll:true});};
$('studio-model').addEventListener('navigationchange',e=>{$('studio-navigation').value=e.detail;$('free-camera-tools').hidden=e.detail!=='free';});
for(const b of document.querySelectorAll('[data-camera-move]'))b.onclick=()=>{scene.travel(...b.dataset.cameraMove.split(',').map(Number));};
function cameraSelection(view){for(const b of document.querySelectorAll('[data-studio-view]'))b.setAttribute('aria-pressed',String(b.dataset.studioView===view));}
for(const b of document.querySelectorAll('[data-studio-view]'))b.onclick=()=>{scene.view(b.dataset.studioView);cameraSelection(b.dataset.studioView);};
$('studio-fit').onclick=()=>{cameraSelection(null);if(draft)scene.fit(localCells(draft.candidate.blocks));else if(site)scene.fit(site.blocks.filter(c=>c.y>=contextFloor));};
function expand(value){document.body.classList.toggle('model-expanded',value);$('studio-expand').setAttribute('aria-pressed',String(value));$('studio-expand').textContent=value?'Exit':'Expand';$('studio-expand').focus();}
$('studio-expand').onclick=()=>expand(!document.body.classList.contains('model-expanded'));
$('studio-lighting').onchange=()=>scene.lighting($('studio-lighting').value);$('studio-grid').onchange=()=>scene.gridVisible($('studio-grid').checked);
$('studio-help').onclick=()=>$('help-dialog').showModal();
// Keyboard: cameras 1–6, F fit, E expand, ? help. Ignored while typing.
const viewKeys=['perspective','front','side','rear','roof','street'];
document.addEventListener('keydown',e=>{if(e.defaultPrevented)return;if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.querySelector('dialog[open]'))return;const view=viewKeys[Number(e.key)-1];if(view){scene.view(view);cameraSelection(view);}else if(e.key==='f'||e.key==='F')$('studio-fit').click();else if(e.key==='e'||e.key==='E')$('studio-expand').click();else if(e.key==='?')$('help-dialog').showModal();else return;e.preventDefault();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('model-expanded'))expand(false);});
async function openCatalogue(reference){const [projectId,revisionId]=reference.split('/'),project=projects.find(p=>p.id===projectId),revision=project?.revisions.find(r=>r.id===revisionId);if(!revision)throw Error('Unknown catalogue design');const existing=index.drafts.find(d=>d.parentHash===revision.hash);if(existing)return renderDraft(await api('drafts/'+existing.id),{frame:true});const d=await api('drafts',{catalogue:reference,author:STUDIO_AUTHOR,transform:{origin:[0,0,0],turns:0},brief:''});await refresh();await renderDraft(d,{frame:true});status('Opened '+project.name+' in the studio as a new draft.');}
async function bridgeStatus(){try{bridge=await api('construction/status');}catch(error){bridge={connected:false,message:error.message};}if(draft)support();$('bridge-status').textContent=bridge.connected?'Construction server connected · '+bridge.world:'Construction server not connected. Design, versions and exports still work.';$('bridge-details').hidden=bridge.connected;$('bridge-detail').textContent=bridge.message||'';updatePlacement();}
async function start(){await refresh();const query=new URL(location.href).searchParams;const id=query.get('draft')||(!query.has('map')&&!query.has('catalogue')?index.drafts[0]?.id:null);
 // Nothing to design yet: open on the site tools so the first action is obvious. Decide before site tools run so a map error still lands in site mode.
 mode(query.has('map')||(!id&&!query.has('catalogue')&&!query.has('site')&&!location.hash)?'site':modeFromHash(location.hash));
 await siteControls.start();projects=await(await fetch('/api/projects')).json();$('catalogue-select').replaceChildren(...projects.flatMap(p=>p.revisions.map(r=>new Option(p.name+' / '+r.label,p.id+'/'+r.id))));if(query.has('catalogue'))await openCatalogue(query.get('catalogue'));else if(query.has('site')&&!query.has('draft'))await chooseSite(query.get('site'));else if(id)await renderDraft(await api('drafts/'+id),{frame:true});const jobId=new URL(location.href).searchParams.get('job');if(jobId){showJob(await api('construction/jobs/'+jobId));mode('construction');}await bridgeStatus();}
let pointerStart;
$('studio-model').addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];});
$('studio-model').addEventListener('click',e=>{
 if(scene.navigationMode()==='free'||scene.navigationMode()==='pan'||!draft||!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>5)return;
 const hit=scene.pick(e);if(!hit)return;const point=hit.point.clone().addScaledVector(hit.face.normal,-.01);
 const pickedIndex=localCells(draft.candidate.blocks).findIndex(c=>c.x===Math.floor(point.x)&&c.y===Math.floor(point.y)&&c.z===Math.floor(point.z));
 const cell=pickedIndex<0?null:draft.candidate.blocks[pickedIndex];partsUI.selectCell(cell);
 if(cell){$('studio-component').value=cell.component;materials();highlight();selection(componentLabel(cell.component),label(cell.block),`${cell.block} · (${cell.x}, ${cell.y}, ${cell.z})`);}
});
let job,pollTimer,placementIssue;
function showJob(next){job=next;if(![...$('job-select').options].some(o=>o.value===job.id))$('job-select').add(new Option(label(job.kind)+' · '+when(job.createdAt),job.id));$('job-select').value=job.id;const url=new URL(location.href);url.searchParams.set('job',job.id);history.replaceState(null,'',url);$('placement-outcome').textContent=job.state.charAt(0).toUpperCase()+job.state.slice(1)+' · '+job.cursor.toLocaleString()+' / '+job.changes.length.toLocaleString()+' blocks · '+job.world+(job.conflicts.length?' · '+job.conflicts.length+' later edits preserved':'')+(job.message?' · '+job.message:'');$('placement-progress').max=Math.max(1,job.changes.length);$('placement-progress').value=job.cursor;record($('placement-summary'),[['World',job.world],['Operation',job.kind==='rollback'?'Undo placement':'Place building'],['Progress',job.cursor.toLocaleString()+' of '+job.changes.length.toLocaleString()+' blocks'],['Later edits preserved',job.conflicts.length],['Readback',job.verifiedAt?when(job.verifiedAt):'Awaiting verification']]);$('placement-summary').dataset.state=job.state;$('placement-summary').dataset.applied=job.cursor;$('placement-summary').dataset.cells=job.changes.length;$('placement-summary').dataset.kind=job.kind;$('download-placement').disabled=false;$('apply-placement').disabled=job.state!=='prepared';$('apply-placement').textContent=job.kind==='rollback'?'Apply reviewed rollback':'Place reviewed changes';$('cancel-placement').disabled=job.state!=='applying';$('reconcile-placement').disabled=Boolean(job.active)||!['paused','conflict'].includes(job.state);$('rollback-placement').disabled=!job.cursor||Boolean(job.pending)||['applying','verifying'].includes(job.state);clearTimeout(pollTimer);if(job.active||['applying','verifying'].includes(job.state))pollTimer=setTimeout(async()=>{try{showJob(await api('construction/jobs/'+job.id));}catch(error){status(error.message,'error');}},1000);updatePlacement();}
$('job-select').onchange=()=>action(async()=>{if($('job-select').value)showJob(await api('construction/jobs/'+$('job-select').value));});
$('prepare-placement').onclick=()=>action(async()=>{await bridgeStatus();const d=requireDraft(),state=placementReadiness(d,site,bridge,index.revisions);if(!state.ready)throw Error(state.message);clearPlacementJob();try{showJob(await api('construction/prepare',{draftId:d.id,artifactHash:d.candidate.hash,idempotencyKey:'place-'+crypto.randomUUID()}));}catch(error){placementIssue={draftId:d.id,hash:d.candidate.hash,worldId:bridge.worldId,message:placementErrorMessage(error.message)};throw error;}status('Review the target world and block changes before placing.');});
$('apply-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/apply`,{changeHash:job.changeHash}));});
$('cancel-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/pause`,{}));});
$('reconcile-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/reconcile`,{}));});
$('rollback-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/rollback`,{}));status('Rollback preview prepared. Later conflicting edits will be preserved.');});
$('material-choice').onchange=()=>{$('material-state').value=$('material-choice').value;};
$('download-review').onclick=()=>action(async()=>{const d=requireDraft();download({diagnostics:d.diagnostics,assessment:d.assessment,access:d.access,surveyHash:d.surveyHash,artifactHash:d.candidate.hash},'design-review.json');});
$('download-placement').onclick=()=>{if(job)download(job,'placement-record.json');};
$('download-handoff').onclick=()=>action(async()=>{const d=requireDraft();await refresh();const revision=index.revisions.find(r=>r.draftId===d.id&&r.artifactHash===d.candidate.hash&&r.surveyHash===d.surveyHash);if(!revision)throw Error('Save this version before exporting a placement package');download(await api('revisions/'+revision.id+'/handoff'),'placement-package.json');status('Saved version and exact survey packaged for placement review.');});
function openConstruction(){history.replaceState(null,'','#place-workspace');mode('construction',{scroll:true});bridgeStatus();}
$('open-construction').onclick=openConstruction;
$('refresh-placement').onclick=()=>action(bridgeStatus);
$('placement-save').onclick=()=>$('save-revision').click();
let copyKey='';
function copyPosition(){return {origin:['placement-x','placement-y','placement-z'].map(id=>$(id).value.trim()===''?NaN:Number($(id).value)),turns:Number($('placement-turns').value)};}
function setCopyPosition(){
 const target=index?.sites.find(s=>s.id===$('placement-site').value);if(!target||!draft)return;
 const samePlot=site&&JSON.stringify(site.plot)===JSON.stringify(target.plot);
 const origin=samePlot&&draft.transform?draft.transform.origin:[target.plot.min[0],Math.max(target.plot.min[1],target.frontage[1]-1),target.plot.min[2]];
 ['placement-x','placement-y','placement-z'].forEach((id,i)=>$(id).value=origin[i]);$('placement-turns').value=samePlot&&draft.transform?draft.transform.turns:0;copyFit();
}
function copyFit(){
 const target=index?.sites.find(s=>s.id===$('placement-site').value),fit=draft?placementFit(draft.candidate,target,copyPosition()):{fits:false,message:'Choose a design.'};
 $('placement-fit').textContent=target?fit.message:'No matching survey yet. Capture a site from the connected server in Site.';
 $('placement-fit').dataset.state=fit.fits?'fits':'blocked';$('create-placement-copy').disabled=!fit.fits||!bridge?.connected||bridge.capabilities?.placement===0||busy;
}
function updatePlacement(){
 const state=placementReadiness(draft,site,bridge,index?.revisions||[]);
 if(state.ready&&placementIssue?.draftId===draft.id&&placementIssue.hash===draft.candidate.hash&&placementIssue.worldId===bridge.worldId){state.kind='preview-blocked';state.title='Placement preview is blocked';state.message=placementIssue.message;}
 $('placement-readiness').dataset.state=state.kind;$('placement-readiness-title').textContent=state.title;$('placement-readiness-message').textContent=state.message;
 $('placement-teaser-title').textContent=state.kind==='ready'?'Ready for placement review':'Build this design';
 $('placement-teaser').textContent=state.kind==='world-mismatch'?`Uses ${site.world} · connected to ${bridge.world}. Prepare a copy to continue.`:state.title;
 $('placement-world').textContent=bridge?.connected?bridge.world:'Not connected';$('placement-source').textContent=site?`${site.name} · ${site.world}`:'No site attached';
 $('prepare-placement').disabled=!state.ready||busy;$('placement-save').hidden=state.kind!=='unsaved';$('placement-save').disabled=busy;
 $('placement-copy-form').hidden=!draft||!['no-site','world-mismatch','identity-mismatch'].includes(state.kind);
 const choices=compatibleSites(index?.sites||[],bridge),key=draft?.id+':'+choices.map(s=>s.id).join(',');
 if(key!==copyKey){copyKey=key;$('placement-site').replaceChildren(...(choices.length?choices.map(s=>new Option(s.name,s.id)):[new Option('No matching surveyed site','')]));setCopyPosition();}copyFit();
 if(job&&job.state==='prepared')$('apply-placement').disabled=!bridge?.connected||job.worldId!==bridge.worldId||busy;
}
$('placement-site').onchange=setCopyPosition;
for(const id of ['placement-x','placement-y','placement-z','placement-turns'])$(id).addEventListener('input',copyFit);
$('placement-copy-form').onsubmit=event=>{event.preventDefault();action(async()=>{
 const source=requireDraft(),target=index.sites.find(s=>s.id===$('placement-site').value),transform=copyPosition();
 await bridgeStatus();if(!compatibleSites([target].filter(Boolean),bridge).length)throw Error('The selected site no longer matches the connected server. Refresh and choose a matching survey.');
 const fit=placementFit(source.candidate,target,transform);if(!fit.fits)throw Error(fit.message);
 const current=await api('drafts/'+source.id);if(current.version!==source.version||current.candidate.hash!==source.candidate.hash)throw Error('The original design changed. Reload it before preparing a copy.');
 status('Preparing placement copy…');
 // Continue this design's version history on the target site, while leaving the source draft intact.
 const latest=await api('context'),targetRevision=latest.revisions.filter(r=>r.project===source.plan.plan_id+':'+target.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
 const copy=await api('drafts',{author:source.author||STUDIO_AUTHOR,plan:{...source.plan,name:source.plan.name.slice(0,100)+' · Placement copy'},parentHash:targetRevision?.artifactHash||source.candidate.hash,siteId:target.id,transform,brief:source.brief});
 await refresh();await renderDraft(copy,{frame:true});mode('construction');
 status(copy.valid?'Placement copy ready. Save this version, then preview placement.':'Placement copy needs changes. Review the findings before saving.',copy.valid?'neutral':'warning');
 });};
function clearPlacementJob(){job=null;placementIssue=null;clearTimeout(pollTimer);$('job-select').value='';$('placement-summary').replaceChildren();$('placement-progress').value=0;$('placement-outcome').textContent='Preview the saved design to prepare a new placement.';for(const id of ['apply-placement','cancel-placement','reconcile-placement','rollback-placement','download-placement'])$(id).disabled=true;const url=new URL(location.href);url.searchParams.delete('job');history.replaceState(null,'',url);}
function draftControls(enabled){
 for(const id of ['apply-material','apply-variant','prepare-request','submit-revision','download-plan','download-schematic','download-review','download-handoff','prepare-placement'])$(id).disabled=!enabled;
 $('save-revision').disabled=!enabled||!draft?.valid;updatePlacement();
 if(!enabled){$('undo-draft').disabled=true;$('redo-draft').disabled=true;}
 $('drawing-empty').hidden=enabled||Boolean(site);
}
draftControls(false);
window.studioStatus=()=>({ready:document.body.dataset.ready==='true',draft:draft?.id,mode:$('studio-main').dataset.mode,metrics:scene?.metrics(),camera:scene?.camera(),changes:changes.length});
const siteControls=siteInterface({api,action,status,refresh,selectSite:chooseSite});
action(start).finally(()=>{$('studio-main').inert=false;$('studio-main').setAttribute('aria-busy','false');});
