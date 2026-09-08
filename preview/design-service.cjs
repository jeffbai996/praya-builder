const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {randomUUID}=require('node:crypto');
const {stateBlock}=require('./mesh.cjs');
const {assessSite,hash}=require('./sites.cjs');
const {checkAccess}=require('./accessibility.cjs');
const {applyVariant}=require('./component-variants.cjs');
const run=promisify(execFile);
const clone=v=>JSON.parse(JSON.stringify(v));
function diff(current,previous){
 const key=c=>`${c.x},${c.y},${c.z}`,old=new Map((previous?.blocks||[]).map(c=>[key(c),c])),result=[];
 for(const c of current.blocks){const before=old.get(key(c));if(!before)result.push({...c,kind:'add'});else if(before.block!==c.block||before.component!==c.component)result.push({...c,kind:'change',before:before.block});old.delete(key(c));}
 for(const c of old.values())result.push({...c,kind:'remove'});return result;
}
async function compilePlan(plan){
 const bytes=JSON.stringify(plan);if(Buffer.byteLength(bytes)>1048576)throw Error('Plan exceeds 1 MiB');
 const root=path.resolve(__dirname,'..'),classpath=fs.readFileSync(path.join(root,'build/regression-classpath.txt'),'utf8').trim();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'builder-compile-')),file=path.join(dir,'plan.json');
 fs.writeFileSync(file,bytes,{mode:0o600});
 const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin/java'):'java';
 try{const {stdout}=await run(java,['-Xmx256m','-cp',classpath,'org.govpraya.builder.plan.PlanCli',file],{cwd:root,timeout:30000,maxBuffer:8*1024*1024});return JSON.parse(stdout);}
 catch(error){throw Error((error.stderr||error.message).slice(0,3000));}
 finally{fs.unlinkSync(file);fs.rmdirSync(dir);}
}
class DesignService{
 constructor(store,{compile=compilePlan}={}){this.store=store;this.compiler=compile;this.tail=Promise.resolve();this.pending=0;}
 async serialized(work){if(this.pending>=4){const e=Error('Compile queue is full; retry after current work finishes');e.status=429;throw e;}this.pending++;const task=this.tail.then(work);this.tail=task.catch(()=>{});try{return await task;}finally{this.pending--;}}
 async evaluate(plan,siteId,transform){
  const artifact=await this.compiler(plan);const {hash:artifactHash,...content}=artifact;if(hash(content)!==artifactHash)throw Error('Compiler artifact hash mismatch');
  const states=new Set(artifact.blocks.map(c=>c.block));for(const state of states)stateBlock(state);
  this.store.putArtifact(artifact);
  const site=siteId?this.store.get('sites',siteId):null,assessment=site?assessSite(site,artifact,transform):null;
  const access=checkAccess(site,artifact,transform),diagnostics=[...(assessment?.errors||[]),...access.issues];
  return {candidate:artifact,valid:!diagnostics.length,diagnostics,assessment,access};
 }
 createDraft(input){return this.serialized(async()=>{
  if(!input.plan||typeof input.plan!=='object')throw Error('A structured plan is required');
  const plan=clone(input.plan),brief=input.brief||'';if(typeof brief!=='string'||brief.length>12000)throw Error('Brief limit exceeded');
  const parent=input.parentHash?this.store.getArtifact(input.parentHash):null;
  if(parent&&parent.plan_id!==plan.plan_id)throw Error('Parent plan identity mismatch');
  const result=await this.evaluate(plan,input.siteId,input.transform);
  const history=[{plan,candidateHash:result.candidate.hash,valid:result.valid,diagnostics:result.diagnostics}];
  return this.store.create('drafts',{schemaVersion:1,project:plan.plan_id+':'+(input.siteId||'unassigned'),brief,parentHash:parent?.hash||null,baselineHash:parent?.hash||result.candidate.hash,siteId:input.siteId||null,surveyHash:result.assessment?.surveyHash||null,transform:input.transform||null,plan,assemblyBaseline:plan,...result,history,cursor:0});
 });}
 editDraft(id,input){return this.serialized(async()=>{
  const draft=this.store.get('drafts',id);this.version(draft,input.expectedVersion);
  const plan=input.plan?clone(input.plan):clone(draft.plan);
  if(plan.plan_id!==draft.plan.plan_id||plan.revision!==draft.plan.revision)throw Error('Draft identity cannot be changed');
  if(input.variant)applyVariant(plan,draft.assemblyBaseline||draft.history[0].plan,input.componentId,input.variant);
  if(input.palette){
   if(typeof input.palette!=='object'||Array.isArray(input.palette))throw Error('Invalid material patch');
   for(const [role,state] of Object.entries(input.palette)){
    if(!/^[a-z][a-z0-9_-]{0,63}$/.test(role))throw Error('Invalid material role');stateBlock(state);
    if(input.componentId){
     const component=plan.components.find(c=>c.id===input.componentId);if(!component)throw Error('Unknown component');
     const localRole='edit_'+hash({id:component.id,role}).slice(0,12);plan.palette[localRole]=state;
     const rewrite=ops=>{for(const op of ops){if(op.material===role)op.material=localRole;if(op.operations)rewrite(op.operations);}};rewrite(component.operations);
    }else plan.palette[role]=state;
   }
  }
  let result;
  try{result=await this.evaluate(plan,draft.siteId,draft.transform);}
  catch(error){result={candidate:draft.candidate,valid:false,diagnostics:[{reason:error.message}],assessment:null};}
  const history=draft.history.slice(0,draft.cursor+1);history.push({plan,candidateHash:result.candidate.hash,valid:result.valid,diagnostics:result.diagnostics});
  if(history.length>50)history.shift();
  return this.store.update('drafts',id,input.expectedVersion,{...draft,plan,...result,history,cursor:history.length-1});
 });}
 history(id,input){return this.serialized(async()=>{
  const draft=this.store.get('drafts',id);this.version(draft,input.expectedVersion);
  if(!['undo','redo'].includes(input.direction))throw Error('Invalid history direction');
  const cursor=draft.cursor+(input.direction==='undo'?-1:1);if(cursor<0||cursor>=draft.history.length)throw Error('No further history');
  const entry=draft.history[cursor],candidate=this.store.getArtifact(entry.candidateHash);
  const assessment=draft.siteId?assessSite(this.store.get('sites',draft.siteId),candidate,draft.transform):null;
  return this.store.update('drafts',id,input.expectedVersion,{...draft,plan:entry.plan,candidate,valid:entry.valid,diagnostics:entry.diagnostics,assessment,cursor});
 });}
 version(draft,expected){if(draft.version!==expected){const e=Error('Revision conflict: reload the current draft');e.status=409;throw e;}}
 save(id,input){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(input.idempotencyKey||''))throw Error('An idempotency key is required');
  const prior=this.store.list('revisions').find(r=>r.draftId===id&&r.idempotencyKey===input.idempotencyKey);
  if(prior){if(prior.artifactHash!==input.candidateHash)throw Error('Idempotency key reused with a different candidate');return prior;}
  const draft=this.store.get('drafts',id);this.version(draft,input.expectedVersion);
  if(!draft.valid)throw Error('Cannot save an invalid draft');
  if(draft.candidate.hash!==input.candidateHash)throw Error('Candidate hash mismatch');
  const existing=this.store.list('revisions').filter(r=>r.project===draft.project).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const current=existing.at(-1);
  if(current&&current.artifactHash!==draft.parentHash&&current.draftId!==id){const e=Error('Revision conflict: another design has been saved; branch from its artifact');e.status=409;throw e;}
  return this.store.create('revisions',{schemaVersion:1,project:draft.project,draftId:id,parentHash:current?.artifactHash||draft.parentHash,artifactHash:draft.candidate.hash,surveyHash:draft.surveyHash,siteId:draft.siteId,transform:draft.transform,brief:draft.brief,plan:draft.plan,idempotencyKey:input.idempotencyKey});
 }
 context(id){
  const d=this.store.get('drafts',id);let site=null;
  if(d.siteId){const {blocks,...metadata}=this.store.get('sites',d.siteId);const heights=Array(metadata.dimensions.x*metadata.dimensions.z).fill(-1);for(const c of blocks){const index=c.x+c.z*metadata.dimensions.x;heights[index]=Math.max(heights[index],c.y);}site={...metadata,nonAirCells:blocks.length,highestNonAir:heights,heightNote:'Local Y, X-major columns; -1 means a known empty column. Highest block is not necessarily ground. Retrieve exact cells from the sites endpoint when needed.'};}
  return {schemaVersion:1,draftId:id,expectedVersion:d.version,brief:d.brief,parentHash:d.parentHash,candidateHash:d.candidate.hash,site,transform:d.transform,plan:d.plan,diagnostics:d.diagnostics,access:d.access,components:d.candidate.components,spaces:d.candidate.spaces,instructions:'Submit structured plans or scoped palette changes. Preserve component identities and unrelated geometry. Compilation does not grant world-write permission.'};
 }
 request(id,input){const draft=this.store.get('drafts',id);this.version(draft,input.expectedVersion);if(typeof input.instruction!=='string'||!input.instruction.trim()||input.instruction.length>6000)throw Error('A bounded revision instruction is required');if(input.componentId&&!draft.plan.components.some(c=>c.id===input.componentId))throw Error('Unknown component');return this.store.create('requests',{schemaVersion:1,draftId:id,baselineHash:draft.candidate.hash,expectedVersion:draft.version,componentId:input.componentId||null,instruction:input.instruction});}
}
module.exports={DesignService,compilePlan,diff};
