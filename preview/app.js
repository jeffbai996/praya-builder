import {projectThumbnail} from './register-thumbnails.js';
import {createScene} from './scene.js';
import {materialIcon} from './material-icons.js';
import {readTheme,saveTheme,bindThemeToggle,readReview,saveReview} from './review-state.js';
import {bindExports} from './exports.js';
import {bindViewerTools} from './viewer-tools.js';
const $=id=>document.getElementById(id);
const key=b=>`${b.x},${b.y},${b.z}`;
const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
let scene,projects=[],project,artifact,other,changed=[],request=0,ready=false,dirty=false;
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
const preferred=readTheme();
let theme=['light','dark','oled'].includes(preferred)?preferred:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
function applyTheme(){document.documentElement.dataset.theme=theme;scene?.theme(theme);}
applyTheme();
try{scene=createScene($('model'));scene.theme(theme);}
catch(error){$('loading').textContent='WebGL could not start. Enable hardware acceleration or try another browser.';$('loading').classList.add('error');}
const getCurrent=()=>ready?{project,artifact}:null;
const viewerTools=bindViewerTools(scene,getCurrent);
bindExports({getCurrent,download});
async function json(url){const response=await fetch(url);if(!response.ok)throw Error(`Could not load design data (${response.status}).`);return response.json();}
function connection(online){$('connection-label').textContent=online?'Live':'Offline';$('connection').classList.toggle('offline',!online);}
async function checkConnection(){
  try{const response=await fetch('/api/health',{signal:AbortSignal.timeout(5000)});const result=await response.json();connection(response.ok&&result.status==='ok');}
  catch{connection(false);}
}
window.addEventListener('offline',()=>connection(false));window.addEventListener('online',checkConnection);
checkConnection();setInterval(checkConnection,30000);
function difference(current,previous){
  if(!previous)return [];
  const old=new Map(previous.blocks.map(b=>[key(b),b])),result=[];
  for(const block of current.blocks){const prior=old.get(key(block));if(!prior)result.push({...block,kind:'add'});else if(prior.block!==block.block||prior.component!==block.component)result.push({...block,kind:'change'});old.delete(key(block));}
  for(const block of old.values())result.push({...block,kind:'remove'});return result;
}
function highlight(){
  if(!ready)return;
  const ceiling=Number($('ceiling').value),id=$('component').value;
  scene.select(id?artifact.blocks.filter(b=>b.component===id&&b.y<ceiling&&b.block!=='minecraft:air'):[]);
  scene.differences($('changes').checked?changed.filter(b=>b.y<ceiling):[]);
  viewerTools.refresh();
}
function showPanel(panel){
  document.body.dataset.panel=panel;
  $('register-panel').hidden=panel!=='register';$('review-panel').hidden=panel==='register';
  $('page-title').textContent=panel==='register'?'Project register':'Design review';
  $('breadcrumb-view').textContent=$('page-title').textContent;
  for(const button of document.querySelectorAll('[data-panel]')){button.classList.toggle('active',button.dataset.panel===panel);button.setAttribute('aria-pressed',String(button.dataset.panel===panel));}
  const url=new URL(location.href);url.searchParams.set('panel',panel);history.replaceState(null,'',url);
}
function tab(name){
  for(const button of document.querySelectorAll('[data-tab]'))button.setAttribute('aria-selected',String(button.dataset.tab===name));
  for(const node of document.querySelectorAll('.tab-panel'))node.hidden=node.id!=='tab-'+name;
}
function writeURL(){
  const url=new URL(location.href);url.searchParams.set('project',project.id);url.searchParams.set('revision',$('revision').value);
  history.replaceState(null,'',url);
}
function setBaselines(){
  const revision=$('revision').value,options=project.revisions.filter(r=>r.id!==revision);
  const index=project.revisions.findIndex(r=>r.id===revision);
  const recommended=project.revisions[index+1]?.id||options[0]?.id||'';
  $('baseline').replaceChildren(...(options.length?options.map(r=>new Option(r.label,r.id)):[new Option('First submission — no baseline','')]));
  $('baseline').value=recommended;$('baseline').disabled=!options.length;
  $('changes').checked=false;$('changes').disabled=!options.length;
}
function configureProject(id,revision){
  project=projects.find(p=>p.id===id)||projects[0];$('project').value=project.id;
  $('revision').replaceChildren(...project.revisions.map(r=>new Option(r.label,r.id)));
  $('revision').value=project.revisions.some(r=>r.id===revision)?revision:project.latest;
  $('ceiling').replaceChildren(...project.layers.map(l=>new Option(l.label,String(l.value))));$('ceiling').value=String(project.layers[0].value);
  setBaselines();scene?.view('perspective');
  for(const button of document.querySelectorAll('[data-view]')){button.classList.toggle('active',button.dataset.view==='perspective');button.setAttribute('aria-pressed',String(button.dataset.view==='perspective'));}
}
function loadNote(){
  const note=readReview(project.id,artifact.hash);$('review-status').value=note.status;$('review-note').value=note.note;
  $('note-status').textContent=note.savedAt?`Saved locally · ${new Date(note.savedAt).toLocaleString()}`:'No saved note for this artifact.';
  dirty=false;
}
function materialSchedule(){
  const counts=new Map();for(const block of artifact.blocks){const name=block.block.split('[')[0];counts.set(name,(counts.get(name)||0)+1);}
  $('materials').replaceChildren(...[...counts].sort((a,b)=>b[1]-a[1]).map(([name,count])=>{
    const material=name.replace('minecraft:','');
    const row=element('li');row.append(materialIcon(material),element('span','material-name',material.replaceAll('_',' ')),element('strong','',count.toLocaleString()));return row;
  }));
}
async function load(){
  if(!project||!scene)return;
  const ticket=++request;ready=false;scene.hide();scene.select([]);scene.differences([]);
  document.body.dataset.ready='false';
  for(const id of ['download','export-review','export-schematic','save-note','copy-hash'])$(id).disabled=true;
  viewerTools.refresh();
  $('loading').className='';$('loading').textContent='Preparing the compiled proposal…';
  const revision=$('revision').value,baseline=$('baseline').value,ceiling=Number($('ceiling').value),current=project;
  const base=`/api/artifact/${current.id}/`,meshURL=`/api/mesh/${current.id}/${revision}?ceiling=${ceiling}`;
  try{
    const [next,previous,mesh]=await Promise.all([json(base+revision),baseline?json(base+baseline):null,json(meshURL)]);
    if(ticket!==request)return;
    if(mesh.hash!==next.hash||mesh.ceiling!==ceiling||next.plan_id!==current.planId||next.revision!==revision)throw Error('Artifact identity mismatch. Reload before reviewing.');
    await scene.load(mesh);if(ticket!==request)return;
    if(artifact?.plan_id!==next.plan_id)scene.frame(next.dimensions);
    const changedArtifact=artifact?.hash!==next.hash;artifact=next;other=previous;changed=difference(next,previous);ready=true;
    $('view-title').textContent=current.name;$('project-name').textContent=current.name;$('case-id').textContent=current.caseId;
    $('project-type').textContent=current.type.toUpperCase();$('description').textContent=next.description;
    $('floors').textContent=String(current.floors).padStart(2,'0');$('units').textContent=current.units;$('count').textContent=next.blocks.length.toLocaleString();
    $('site-label').textContent=current.site;$('revision-tag').textContent=`R${revision.slice(1).padStart(2,'0')}`;
    $('site-size').textContent=`${artifact.dimensions.x} × ${artifact.dimensions.z}`;
    $('site-dimensions').textContent=`${artifact.dimensions.x} × ${artifact.dimensions.z} BLOCK SITE`;
    $('identity').textContent=`${next.hash.slice(0,12)} · mesh ${mesh.buildMs} ms`;
    $('copy-hash').textContent=next.hash.slice(0,12)+' ⧉';
    const selected=$('component').value;
    $('component').replaceChildren(new Option('All components',''),...next.components.map(c=>new Option(c.id.replaceAll('-',' '),c.id)));
    $('component').value=next.components.some(c=>c.id===selected)?selected:'';
    const counts=Object.fromEntries(['add','change','remove'].map(kind=>[kind,changed.filter(b=>b.kind===kind).length]));
    $('diff').textContent=previous?`Versus ${baseline.toUpperCase()}: ${counts.add} added · ${counts.change} changed · ${counts.remove} removed`:'Initial submission. Select a future revision to compare changes.';
    $('selection').textContent='Click a block to identify its component and state.';
    materialSchedule();if(changedArtifact)loadNote();
    scene.show();highlight();$('loading').className='hidden';
    for(const id of ['download','export-review','export-schematic','save-note','copy-hash'])$(id).disabled=false;
    document.body.dataset.ready='true';document.body.dataset.revision=revision;document.body.dataset.project=current.id;
    writeURL();
  }catch(error){
    if(ticket!==request)return;
    ready=false;scene.hide();document.body.dataset.ready='false';$('loading').className='error';
    $('loading').textContent=`${error.message} Select a revision again or reload to retry.`;
  }
}
function renderRegister(){
  const search=$('search').value.trim().toLowerCase(),use=$('register-use').value,sort=$('register-sort').value;let visible=0;
  const cards=[...$('project-cards').children];
  cards.sort((a,b)=>{
    const one=projects.find(p=>p.id===a.dataset.id),two=projects.find(p=>p.id===b.dataset.id);
    if(sort==='name')return one.name.localeCompare(two.name);
    if(sort==='area'){const area=p=>{const d=p.revisions.find(r=>r.id===p.latest).dimensions;return d.x*d.z;};return area(two)-area(one);}
    return one.caseId.localeCompare(two.caseId);
  });
  $('project-cards').append(...cards);
  for(const card of $('project-cards').children){
    const current=projects.find(p=>p.id===card.dataset.id);
    card.hidden=(use&&current.type!==use)||!([current.name,current.type,current.caseId,current.summary].join(' ').toLowerCase().includes(search));if(!card.hidden)visible++;
  }
  $('no-projects').hidden=visible>0;$('register-count').textContent=`${visible} of ${projects.length} files`;
}
function createCards(){
  $('register-use').replaceChildren(new Option('All building uses',''),...[...new Set(projects.map(p=>p.type))].sort().map(type=>new Option(type,type)));
  $('project-cards').replaceChildren(...projects.map(current=>{
    const card=element('article','project-card');card.dataset.id=current.id;
    const top=element('div','project-card-top');
    top.append(element('span','case-stamp',current.caseId+' / CONCEPT'),projectThumbnail(current));
    const body=element('div','project-card-body'),meta=element('div','project-card-meta');
    const dimensions=current.revisions.find(r=>r.id===current.latest).dimensions;
    meta.append(element('span','',`${dimensions.x} × ${dimensions.z} site`),element('span','',current.floors+' floors'),element('span','',current.units),element('span','',current.revisions.length+' revision'+(current.revisions.length===1?'':'s')));
    const button=element('button','secondary-button','Open project file ↗');button.dataset.openProject=current.id;
    button.addEventListener('click',()=>{if(!leaveDraft())return;configureProject(current.id,current.latest);showPanel('review');load();});
    body.append(element('div','eyebrow',current.type.toUpperCase()),element('h3','',current.name),element('p','',current.summary),meta,button);card.append(top,body);return card;
  }));renderRegister();
}
function leaveDraft(){return !dirty||confirm('This revision has unsaved local notes. Leave without saving them?');}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('project').addEventListener('change',()=>{if(!leaveDraft()){$('project').value=project.id;return;}configureProject($('project').value);showPanel('review');load();});
$('revision').addEventListener('change',()=>{if(!leaveDraft()){$('revision').value=artifact.revision;return;}setBaselines();load();});
$('ceiling').addEventListener('change',load);$('baseline').addEventListener('change',load);
$('component').addEventListener('change',()=>{highlight();const c=artifact?.components.find(c=>c.id===$('component').value);$('selection').textContent=c?`${c.role}. Outline shows owned bounds.`:'Click a block to identify its component and state.';});
$('changes').addEventListener('change',highlight);
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{scene?.view(button.dataset.view);for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}});
for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>showPanel(button.dataset.panel));
const tabs=[...document.querySelectorAll('[data-tab]')];
for(const button of tabs){
  button.id='assessment-'+button.dataset.tab;button.setAttribute('aria-controls','tab-'+button.dataset.tab);
  $('tab-'+button.dataset.tab).setAttribute('aria-labelledby',button.id);
  button.addEventListener('click',()=>tab(button.dataset.tab));
  button.addEventListener('keydown',event=>{
    const index=tabs.indexOf(button);let next;
    if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];
    else if(event.key==='ArrowLeft')next=tabs[(index+tabs.length-1)%tabs.length];
    else if(event.key==='Home')next=tabs[0];else if(event.key==='End')next=tabs.at(-1);else return;
    event.preventDefault();tab(next.dataset.tab);next.focus();
  });
}
$('nav-notes').addEventListener('click',()=>{showPanel('review');tab('notes');$('review-note').focus();});
$('search').addEventListener('input',()=>{showPanel('register');renderRegister();});
bindThemeToggle($('theme-toggle'),theme,value=>{theme=value;applyTheme();if(!saveTheme(theme))toast('Theme changed for this session; browser storage is unavailable.');});
for(const id of ['register-use','register-sort'])$(id).addEventListener('change',renderRegister);
for(const button of document.querySelectorAll('button[data-layout]'))button.addEventListener('click',()=>{
  $('project-cards').dataset.layout=button.dataset.layout;
  for(const option of document.querySelectorAll('button[data-layout]'))option.setAttribute('aria-pressed',String(option===button));
});
$('help').addEventListener('click',()=>$('help-dialog').showModal());
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('search').focus();}});
for(const id of ['review-note','review-status'])$(id).addEventListener('input',()=>{dirty=true;$('note-status').textContent='Unsaved changes · Save local note before switching revisions.';});
$('save-note').addEventListener('click',()=>{
  if(!ready)return;
  try{const saved=saveReview(project.id,artifact.hash,{status:$('review-status').value,note:$('review-note').value});dirty=false;$('note-status').textContent='Saved locally · '+new Date(saved.savedAt).toLocaleString();toast('Note saved in this browser for this artifact.');}
  catch{toast('Could not save: browser storage is unavailable or full. Export the review to keep your note.');}
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
$('copy-hash').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(artifact.hash);toast('Artifact fingerprint copied.');}catch{toast('Clipboard unavailable. The full fingerprint is included in Export review.');}});
$('export-review').addEventListener('click',()=>{
  if(!ready)return;
  const saved=readReview(project.id,artifact.hash);
  const record={schemaVersion:1,project:project.id,caseId:project.caseId,name:project.name,revision:artifact.revision,artifactHash:artifact.hash,
    exportedAt:new Date().toISOString(),dimensions:artifact.dimensions,cells:artifact.blocks.length,
    baselineHash:other?.hash||null,view:{ceiling:Number($('ceiling').value),camera:scene.camera()},
    review:{status:$('review-status').value,note:$('review-note').value,savedAt:dirty?null:saved.savedAt},
    authority:'Local design review only. Not a permit, construction approval, or world-write authorization.'};
  download(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}),`${project.caseId}-${artifact.revision}-review.json`);
});
$('download').addEventListener('click',()=>{
  if(!ready)return;
  const label=`${project.caseId} / ${artifact.name} / ${artifact.revision.toUpperCase()} / ${artifact.hash.slice(0,12)} / study lighting`;
  scene.png(label).toBlob(blob=>{if(blob)download(blob,`${project.id}-${artifact.revision}-${artifact.hash.slice(0,8)}.png`);});
});
let down;
$('model').addEventListener('pointerdown',event=>down=[event.clientX,event.clientY]);
$('model').addEventListener('pointerup',event=>{
  if(!ready||!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>5)return;
  const hit=scene.pick(event);if(!hit)return;
  const candidates=[-.01,.01].map(delta=>({x:Math.floor(hit.point.x+hit.face.normal.x*delta),y:Math.floor(hit.point.y+hit.face.normal.y*delta),z:Math.floor(hit.point.z+hit.face.normal.z*delta)}));
  const block=candidates.map(pos=>artifact.blocks.find(b=>key(b)===key(pos)&&b.block!=='minecraft:air')).find(Boolean);
  if(block){$('component').value=block.component;$('selection').textContent=`${block.component} · ${block.block} · (${block.x}, ${block.y}, ${block.z})`;highlight();}
});
window.previewStatus=()=>({ready,project:project?.id,revision:artifact?.revision,hash:artifact?.hash,camera:scene?.camera(),metrics:scene?.metrics(),presentation:scene?.presentation(),changes:changed.length});
async function init(){
  try{
    projects=await json('/api/projects');$('project').replaceChildren(...projects.map(p=>new Option(p.name,p.id)));
    $('nav-count').textContent=String(projects.length).padStart(2,'0');$('project-total').textContent=projects.length;
    $('revision-total').textContent=projects.reduce((n,p)=>n+p.revisions.length,0);createCards();
    const params=new URLSearchParams(location.search);showPanel(params.get('panel')==='register'?'register':'review');configureProject(params.get('project'),params.get('revision'));await load();
  }catch(error){$('loading').className='error';$('loading').textContent=error.message+' Reload to retry.';}
}
init();
