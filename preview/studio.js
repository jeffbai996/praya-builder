import {label,componentLabel,coordinates,setCoordinates,record,review,finishChoices,siteInterface} from './studio-interface.js';
import {createScene} from './scene.js';
import {readTheme,saveTheme,bindThemeToggle} from './review-state.js';
const $=id=>document.getElementById(id);
let scene,draft,site,index,ticket=0,busy=false,changes=[],contextFloor=0,contextSurface=0;
const status=message=>{$('studio-status').textContent=message;};
const preferred=readTheme(),theme=['light','dark','oled'].includes(preferred)?preferred:'light';document.documentElement.dataset.theme=theme;
try{scene=createScene($('studio-model'));scene.theme(theme);}catch(error){status(error.message);}
bindThemeToggle($('theme-toggle'),theme,value=>{document.documentElement.dataset.theme=value;saveTheme(value);scene?.theme(value);});
async function api(route,body){const response=await fetch('/api/workspace/'+route,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json','X-Builder-Write':'1'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok){throw Error(data.error||'Workspace request failed');}return data;}
async function action(work){if(busy)return;busy=true;document.body.dataset.busy='true';try{await work();}catch(error){status(error.message);}finally{busy=false;document.body.dataset.busy='false';}}
function download(value,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function refresh(){index=await api('context');$('studio-main').hidden=false;const sid=$('site-select').value,did=$('draft-select').value;$('site-select').replaceChildren(new Option('No site selected',''),...index.sites.map(s=>new Option(s.name,s.id)));$('site-select').value=sid;$('draft-select').replaceChildren(new Option('Choose a draft',''),...index.drafts.map(d=>new Option(d.name+(d.valid?'':' · needs changes'),d.id)));$('draft-select').value=did;$('saved-revision').replaceChildren(...index.revisions.map(r=>new Option(r.plan.name+' · '+new Date(r.createdAt).toLocaleString(),r.id)));$('continue-revision').disabled=!index.revisions.length;$('job-select').replaceChildren(new Option('Choose a construction job',''),...(index.jobs||[]).map(j=>new Option(label(j.kind)+' · '+label(j.state)+' · '+new Date(j.createdAt).toLocaleString(),j.id)));status(`${index.sites.length} surveys · ${index.drafts.length} drafts · ${index.revisions.length} saved revisions`);}
async function selectSite(id){site=id?await api('sites/'+id):null;$('site-select').value=id||'';scene.siteBounds(site);const templateFits=Boolean(site&&site.plot.max[0]-site.plot.min[0]>=32&&site.plot.max[2]-site.plot.min[2]>=32);$('new-proposals').disabled=!templateFits;$('study-site-note').hidden=!site||templateFits;if(site){await loadSiteView();setCoordinates('origin',site.plot.min);$('site-summary').textContent=`${site.plot.max[0]-site.plot.min[0]} × ${site.plot.max[2]-site.plot.min[2]} plot · ${site.dimensions.x} × ${site.dimensions.z} surveyed · ${site.world} · captured ${new Date(site.capturedAt).toLocaleString()} · ${site.protected.length} protected areas`;}else{await scene.loadContext({sections:[]});$('site-summary').textContent='No survey bound.';}}
async function loadSiteView(){if(!site)return;const mesh=await api(`sites/${site.id}/mesh?depth=${$('context-depth').checked?'full':'surface'}`);contextFloor=mesh.floor;contextSurface=mesh.surfaceY;scene.siteBounds({...site,plot:$('context-depth').checked?site.plot:{min:[site.plot.min[0],site.frontage[1]+.05,site.plot.min[2]],max:[site.plot.max[0],site.frontage[1]+.15,site.plot.max[2]]}});await scene.loadContext(mesh);scene.frame(site.dimensions,contextSurface);scene.fit(site.blocks.filter(c=>c.y>=contextFloor));cameraSelection(null);}
$('context-depth').onchange=()=>action(loadSiteView);
function localCells(cells){const offset=site?draft.transform.origin.map((v,i)=>v-site.origin[i]):[0,0,0];return cells.map(c=>{let {x,z}=c,w=draft.candidate.dimensions.x,d=draft.candidate.dimensions.z;for(let i=0;i<(draft.transform?.turns||0);i++){[x,z]=[d-1-z,x];[w,d]=[d,w];}return {...c,x:x+offset[0],y:c.y+offset[1],z:z+offset[2]};});}
function highlight(){const id=$('studio-component').value;scene.select(id?localCells(draft.candidate.blocks.filter(c=>c.component===id)):[]);const overlays=$('diff-visible').checked?localCells(changes):[];if($('impact-visible').checked&&site&&draft.assessment)for(const [cells,kind]of [[draft.assessment.collisions,'change'],[draft.assessment.excavations,'remove']])for(const c of cells)overlays.push({...c,x:c.x-site.origin[0],y:c.y-site.origin[1],z:c.z-site.origin[2],kind});scene.differences(overlays);}
async function renderDraft(next,{frame=false}={}){
 const token=++ticket;const mesh=await api(`drafts/${next.id}/mesh?ceiling=${$('studio-ceiling').value}`);if(token!==ticket)return;
 if(next.siteId!==site?.id)await selectSite(next.siteId);if(token!==ticket)return;
 draft=next;await scene.load(mesh);if(token!==ticket)return;
 scene.position(site?draft.transform.origin.map((v,i)=>v-site.origin[i]):[0,0,0]);scene.show();
 if(frame)scene.frame(site?.dimensions||draft.candidate.dimensions,site?contextSurface:0);
 $('draft-select').value=draft.id;$('draft-title').textContent=draft.plan.name;
 const selected=$('studio-component').value;$('studio-component').replaceChildren(new Option('Whole proposal',''),...draft.plan.components.map(c=>new Option(componentLabel(c.id),c.id)));$('studio-component').value=selected;
 materials();changes=await api(`drafts/${draft.id}/diff`);highlight();
 $('candidate-state').textContent=draft.valid?'Valid candidate':'Candidate needs changes';
 $('candidate-summary').textContent=`${draft.candidate.blocks.length.toLocaleString()} cells · ${changes.length.toLocaleString()} changes from baseline · draft version ${draft.version}`;
 review(draft);
 $('save-revision').disabled=!draft.valid;$('undo-draft').disabled=draft.cursor===0;$('redo-draft').disabled=draft.cursor===draft.history.length-1;
 draftControls(true);document.body.dataset.draft=draft.id;document.body.dataset.ready='true';
 const url=new URL(location.href);url.searchParams.set('draft',draft.id);history.replaceState(null,'',url);
}
function materials(){
 if(!draft)return;const id=$('studio-component').value,selected=$('material-role').value,roles=new Set();
 const collect=ops=>{for(const op of ops){if(op.material&&op.material!=='air')roles.add(op.material);if(op.operations)collect(op.operations);}};
 for(const c of draft.plan.components)if(!id||c.id===id)collect(c.operations);
 $('material-role').replaceChildren(...[...roles].sort().map(k=>new Option(label(k),k)));
 if(roles.has(selected))$('material-role').value=selected;
 $('material-state').value=draft.plan.palette[$('material-role').value]||'';finishChoices($('material-state').value);
 $('roof-variant-controls').hidden=!/^study-(bar|staggered|court)$/.test(draft.plan.plan_id)||!/^wing-[01]-roof$/.test(id);
}
const requireDraft=()=>{if(!draft)throw Error('Choose a draft first');return draft;};
function placement(){const origin=coordinates('origin');return {siteId:site?.id,transform:{origin,turns:Number($('turns').value)},brief:$('brief').value};}
async function chooseSite(id){await selectSite(id);draft=null;$('draft-select').value='';delete document.body.dataset.draft;document.body.dataset.ready='false';scene.hide();draftControls(false);$('candidate-state').textContent='No candidate';$('candidate-summary').textContent='';$('review-metrics').replaceChildren();$('diagnostics').replaceChildren();$('draft-title').textContent='Choose a proposal for this site';const url=new URL(location.href);url.searchParams.delete('draft');if(id)url.searchParams.set('site',id);else url.searchParams.delete('site');history.replaceState(null,'',url);}
$('site-select').onchange=()=>action(()=>chooseSite($('site-select').value));
$('draft-select').onchange=()=>action(async()=>{if($('draft-select').value)await renderDraft(await api('drafts/'+$('draft-select').value),{frame:true});});
for(const kind of ['flat','slope'])$('fixture-'+kind).onclick=()=>action(async()=>{const saved=await api('fixtures',{kind});await refresh();await chooseSite(saved.id);status('Synthetic '+kind+' test plot ready.');});
$('catalogue-draft').onclick=()=>action(async()=>{const d=await api('drafts',{...placement(),catalogue:$('catalogue-select').value});await refresh();await renderDraft(d,{frame:true});});
$('import-plan').onclick=()=>action(async()=>{const file=$('plan-file').files[0];if(!file)throw Error('Choose a plan JSON file');const d=await api('drafts',{...placement(),plan:JSON.parse(await file.text())});await refresh();await renderDraft(d,{frame:true});});
$('continue-revision').onclick=()=>action(async()=>{const r=index.revisions.find(r=>r.id===$('saved-revision').value);if(!r)throw Error('Choose a saved revision');const d=await api('drafts',{plan:r.plan,parentHash:r.artifactHash,siteId:r.siteId,transform:r.transform,brief:r.brief});await refresh();await renderDraft(d,{frame:true});status('Continuing the saved design; its accepted record is unchanged.');});
$('new-proposals').onclick=()=>action(async()=>{if(!site)throw Error('Select a site first');status('Compiling three apartment studies…');const result=await api('proposals',{siteId:site.id});await refresh();await renderDraft(result[0],{frame:true});status('Three alternatives created. Switch working draft to compare them.');});
$('apply-material').onclick=()=>action(async()=>{const d=requireDraft();status('Compiling material revision…');await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,componentId:$('studio-component').value||undefined,palette:{[$('material-role').value]:$('material-state').value}}));status('Candidate updated. Camera retained.');});
for(const direction of ['undo','redo'])$(direction+'-draft').onclick=()=>action(async()=>{const d=requireDraft();await renderDraft(await api(`drafts/${d.id}/history`,{expectedVersion:d.version,direction}));});
$('save-revision').onclick=()=>action(async()=>{const d=requireDraft(),saved=await api(`drafts/${d.id}/save`,{expectedVersion:d.version,candidateHash:d.candidate.hash,idempotencyKey:'save-'+d.candidate.hash});await refresh();status('Saved revision of '+saved.plan.name);});
$('prepare-request').onclick=()=>action(async()=>{const d=requireDraft(),request=await api(`drafts/${d.id}/request`,{expectedVersion:d.version,componentId:$('studio-component').value,instruction:$('revision-instruction').value});download({request,context:await api(`drafts/${d.id}/context`)},'design-request.json');status('Agent request includes the exact baseline, component and site context.');});
$('submit-revision').onclick=()=>action(async()=>{const d=requireDraft(),file=$('revision-file').files[0];if(!file)throw Error('Choose the revised plan JSON');await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,plan:JSON.parse(await file.text())}));});
$('download-plan').onclick=()=>action(async()=>download(requireDraft().plan,'proposal.plan.json'));
$('download-schematic').onclick=()=>action(async()=>{const d=requireDraft(),a=document.createElement('a');a.href=`/api/workspace/drafts/${d.id}/schematic`;a.download='proposal.schem';a.click();});
$('apply-variant').onclick=()=>action(async()=>{const d=requireDraft();await renderDraft(await api(`drafts/${d.id}/edit`,{expectedVersion:d.version,componentId:$('studio-component').value,variant:{name:'roof-canopy',value:$('roof-variant').value}}));});
$('material-role').onchange=()=>{$('material-state').value=draft.plan.palette[$('material-role').value];finishChoices($('material-state').value);};
$('studio-component').onchange=()=>{if(draft){materials();highlight();}};$('diff-visible').onchange=()=>{if(draft)highlight();};$('impact-visible').onchange=()=>{if(draft)highlight();};$('context-visible').onchange=()=>scene.contextVisible($('context-visible').checked);
$('studio-ceiling').onchange=()=>action(async()=>{if(draft)await renderDraft(draft);});
function cameraSelection(view){for(const b of document.querySelectorAll('[data-studio-view]'))b.setAttribute('aria-pressed',String(b.dataset.studioView===view));}
for(const b of document.querySelectorAll('[data-studio-view]'))b.onclick=()=>{scene.view(b.dataset.studioView);cameraSelection(b.dataset.studioView);};
$('studio-fit').onclick=()=>{cameraSelection(null);if(draft)scene.fit(localCells(draft.candidate.blocks));else if(site)scene.fit(site.blocks.filter(c=>c.y>=contextFloor));cameraSelection(null);};
async function start(){await refresh();await siteControls.start();const projects=await(await fetch('/api/projects')).json();$('catalogue-select').replaceChildren(...projects.flatMap(p=>p.revisions.map(r=>new Option(p.name+' / '+r.id,p.id+'/'+r.id))));const query=new URL(location.href).searchParams;const id=query.get('draft')||(!query.has('map')?index.drafts[0]?.id:null);if(query.has('site')&&!query.has('draft'))await chooseSite(query.get('site'));else if(id)await renderDraft(await api('drafts/'+id),{frame:true});const jobId=new URL(location.href).searchParams.get('job');if(jobId)showJob(await api('construction/jobs/'+jobId));try{const bridge=await api('construction/status');$('bridge-status').textContent=bridge.connected?'Isolated server connected · '+bridge.world:bridge.message;}catch{$('bridge-status').textContent='Isolated server is not configured. Design and export remain available.';}}
let pointerStart;
$('studio-model').addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];});
$('studio-model').addEventListener('click',e=>{
 if(!draft||!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>5)return;
 const hit=scene.pick(e);if(!hit)return;const point=hit.point.clone().addScaledVector(hit.face.normal,-.01);
 const cell=localCells(draft.candidate.blocks).find(c=>c.x===Math.floor(point.x)&&c.y===Math.floor(point.y)&&c.z===Math.floor(point.z));
 if(cell){$('studio-component').value=cell.component;materials();highlight();status(componentLabel(cell.component)+' · '+label(cell.block));}
});
let job,pollTimer;
function showJob(next){job=next;if(![...$('job-select').options].some(o=>o.value===job.id))$('job-select').add(new Option(label(job.kind)+' · '+new Date(job.createdAt).toLocaleString(),job.id));$('job-select').value=job.id;const url=new URL(location.href);url.searchParams.set('job',job.id);history.replaceState(null,'',url);$('placement-outcome').textContent=job.state.charAt(0).toUpperCase()+job.state.slice(1)+' · '+job.cursor.toLocaleString()+' / '+job.changes.length.toLocaleString()+' blocks · '+job.world+(job.conflicts.length?' · '+job.conflicts.length+' later edits preserved':'')+(job.message?' · '+job.message:'');$('placement-progress').max=Math.max(1,job.changes.length);$('placement-progress').value=job.cursor;record($('placement-summary'),[['World',job.world],['Operation',job.kind==='rollback'?'Undo placement':'Place building'],['Progress',job.cursor.toLocaleString()+' of '+job.changes.length.toLocaleString()+' blocks'],['Later edits preserved',job.conflicts.length],['Readback',job.verifiedAt?new Date(job.verifiedAt).toLocaleString():'Awaiting verification']]);$('placement-summary').dataset.state=job.state;$('placement-summary').dataset.applied=job.cursor;$('placement-summary').dataset.cells=job.changes.length;$('placement-summary').dataset.kind=job.kind;$('download-placement').disabled=false;$('apply-placement').disabled=job.state!=='prepared';$('apply-placement').textContent=job.kind==='rollback'?'Apply reviewed rollback':'Place reviewed changes';$('cancel-placement').disabled=job.state!=='applying';$('reconcile-placement').disabled=Boolean(job.active)||!['paused','conflict'].includes(job.state);$('rollback-placement').disabled=!job.cursor||Boolean(job.pending)||['applying','verifying'].includes(job.state);clearTimeout(pollTimer);if(job.active||['applying','verifying'].includes(job.state))pollTimer=setTimeout(async()=>{try{showJob(await api('construction/jobs/'+job.id));}catch(error){status(error.message);}},1000);}
$('job-select').onchange=()=>action(async()=>{if($('job-select').value)showJob(await api('construction/jobs/'+$('job-select').value));});
$('prepare-placement').onclick=()=>action(async()=>{const d=requireDraft();showJob(await api('construction/prepare',{draftId:d.id,artifactHash:d.candidate.hash,idempotencyKey:'place-'+crypto.randomUUID()}));status('Review the target world and block changes before placing.');});
$('apply-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/apply`,{changeHash:job.changeHash}));});
$('cancel-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/pause`,{}));});
$('reconcile-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/reconcile`,{}));});
$('rollback-placement').onclick=()=>action(async()=>{showJob(await api(`construction/jobs/${job.id}/rollback`,{}));status('Rollback preview prepared. Later conflicting edits will be preserved.');});
$('material-choice').onchange=()=>{$('material-state').value=$('material-choice').value;};
$('download-review').onclick=()=>action(async()=>{const d=requireDraft();download({diagnostics:d.diagnostics,assessment:d.assessment,access:d.access,surveyHash:d.surveyHash,artifactHash:d.candidate.hash},'design-review.json');});
$('download-placement').onclick=()=>{if(job)download(job,'placement-record.json');};
$('download-handoff').onclick=()=>action(async()=>{const d=requireDraft();await refresh();const revision=index.revisions.find(r=>r.draftId===d.id&&r.artifactHash===d.candidate.hash&&r.surveyHash===d.surveyHash);if(!revision)throw Error('Save this design revision before exporting a placement package');download(await api('revisions/'+revision.id+'/handoff'),'placement-package.json');status('Saved design and exact survey packaged for placement review.');});
function draftControls(enabled){
 for(const id of ['apply-material','apply-variant','prepare-request','submit-revision','download-plan','download-schematic','download-review','download-handoff','prepare-placement'])$(id).disabled=!enabled;
 $('save-revision').disabled=!enabled||!draft?.valid;
 if(!enabled){$('undo-draft').disabled=true;$('redo-draft').disabled=true;}
 $('drawing-empty').hidden=enabled||Boolean(site);
}
draftControls(false);
const siteControls=siteInterface({api,action,status,refresh,selectSite:chooseSite});
action(start).finally(()=>{$('studio-main').inert=false;$('studio-main').setAttribute('aria-busy','false');});
