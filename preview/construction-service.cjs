const {hash,assessSite}=require('./sites.cjs');
const {stateBlock}=require('./mesh.cjs');
const component=value=>{const v=JSON.parse(value);return typeof v==='string'?{text:v}:v;};
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const signKey=sign=>sign?JSON.stringify(stable({...sign,front:{...sign.front,lines:sign.front.lines.map(component)},back:{...sign.back,lines:sign.back.lines.map(component)}})):null;
const snapshot=value=>typeof value==='string'?{block:value,sign:null}:value;
const before=c=>({block:c.before,sign:c.beforeSign||null}),after=c=>({block:c.block,sign:c.sign||null});
const equal=(a,b)=>{a=snapshot(a);b=snapshot(b);return stateBlock(a.block).stateId===stateBlock(b.block).stateId&&signKey(a.sign)===signKey(b.sign);};
const authoredSign=lines=>({front:{lines:lines.map(text=>JSON.stringify({text})),color:'black',glowing:false},back:{lines:Array(4).fill('""'),color:'black',glowing:false},waxed:true});
class PaperBridge{
 constructor({url=process.env.BUILDER_BRIDGE_URL,token=process.env.BUILDER_BRIDGE_TOKEN}={}){this.url=url;this.token=token;}
 async call(route,body){if(!this.url||!this.token)throw Error('Isolated Paper bridge is not configured');const url=new URL(this.url);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Bridge must use loopback');const response=await fetch(new URL(route,url),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Paper bridge request failed');return result;}
 status(){return this.call('/status');}
 survey(cells,worldId){return this.call('/survey',{worldId,cells});}
 async read(cells,worldId){const result=await this.call('/read',{worldId,cells:cells.map(({x,y,z})=>({x,y,z}))});return result.states.map((block,i)=>result.signs?.[i]?{block,sign:result.signs[i]}:block);}
 batch(changes,worldId){return this.call('/batch',{worldId,changes});}
 validate(changes,worldId){return this.call('/validate',{worldId,changes});}
}
class ConstructionService{
 constructor(store,bridge=new PaperBridge(),{batchSize=128}={}){this.store=store;this.bridge=bridge;this.batchSize=batchSize;this.active=null;this.running=Promise.resolve();for(const job of store.list('jobs'))if(job.state==='applying'||job.state==='verifying')this.update(job.id,{state:'paused',message:'Service restarted; reconcile before continuing'});}
 update(id,patch){const old=this.store.get('jobs',id);return this.store.update('jobs',id,old.version,{...old,...patch});}
 async status(){try{return await this.bridge.status();}catch(error){return {connected:false,message:error.message};}}
 async read(cells,worldId){const result=[];for(let i=0;i<cells.length;i+=this.batchSize)result.push(...await this.bridge.read(cells.slice(i,i+this.batchSize),worldId));return result;}
 async prepare(draftId,input){
  const draft=this.store.get('drafts',draftId);
  const prior=this.store.list('jobs').find(j=>j.idempotencyKey===input.idempotencyKey);
  if(prior){if(prior.sourceDraftId!==draftId||prior.artifactHash!==input.artifactHash)throw Error('Placement key reused for a different draft');return prior;}
  if(!draft.valid||!draft.siteId)throw Error('A valid, site-bound draft is required');
  if(input.artifactHash!==draft.candidate.hash)throw Error('Artifact hash mismatch');
  if(!this.store.list('revisions').some(r=>r.artifactHash===draft.candidate.hash))throw Error('Save the exact design revision before placement');
  const site=this.store.get('sites',draft.siteId),status=await this.bridge.status();
  if(draft.candidate.signs?.length&&status.capabilities?.signData!==1)throw Error('Bridge needs sign-data support before placing this revision');
  if(status.world!==site.world)throw Error('Survey world differs from the isolated bridge world');
  if(site.worldId&&site.worldId!==status.worldId)throw Error('Survey world identity differs from the connected world; capture a fresh survey');
  const assessment=assessSite(site,draft.candidate,draft.transform);if(!assessment.valid)throw Error('Proposal violates the plot or protected areas');
  const {transformCells}=require('./sites.cjs');
  for(const sign of draft.candidate.signs||[]){
   const [x,y,z]=sign.at,cell=draft.candidate.blocks.find(c=>c.x===x&&c.y===y&&c.z===z);
   const placed=transformCells({...draft.candidate,blocks:[cell]},draft.transform)[0];
   if(site.protected.some(b=>[placed.x,placed.y,placed.z].every((v,i)=>v>=b.min[i]&&v<b.max[i])))throw Error('Sign text change intersects a protected area');
   let change=assessment.changes.find(c=>c.x===placed.x&&c.y===placed.y&&c.z===placed.z);
   if(!change){change={...placed,before:placed.block};assessment.changes.push(change);}
   change.sign=authoredSign(sign.lines);
  }
  const current=await this.read(assessment.changes,status.worldId);
  if(current.some((state,i)=>stateBlock(snapshot(state).block).stateId!==stateBlock(assessment.changes[i].before).stateId))throw Error('Survey is stale at the proposed changes; import a fresh survey');
  assessment.changes=assessment.changes.map((c,i)=>({...c,before:snapshot(current[i]).block,beforeSign:snapshot(current[i]).sign||null}));
  if(this.bridge.validate)for(let i=0;i<assessment.changes.length;i+=this.batchSize)await this.bridge.validate(assessment.changes.slice(i,i+this.batchSize),status.worldId);
  return this.prepareChanges({...assessment,sourceDraftId:draftId,world:status.world,worldId:status.worldId,changes:assessment.changes,idempotencyKey:input.idempotencyKey});
 }
 async prepareChanges(input){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(input.idempotencyKey||''))throw Error('Placement idempotency key required');
  if(!Array.isArray(input.changes)||input.changes.length>10000)throw Error('Placement budget exceeded');
  const content={worldId:input.worldId,sourceDraftId:input.sourceDraftId,artifactHash:input.artifactHash,surveyHash:input.surveyHash,changes:input.changes},changeHash=hash(content);
  const prior=this.store.list('jobs').find(j=>j.idempotencyKey===input.idempotencyKey);
  if(prior){if(prior.changeHash!==changeHash)throw Error('Placement key reused with different changes');return prior;}
  return this.store.create('jobs',{schemaVersion:1,...content,world:input.world,changeHash,idempotencyKey:input.idempotencyKey,state:'prepared',cursor:0,pending:null,conflicts:input.conflicts||[],timings:[],kind:input.kind||'placement'});
 }
 apply(id,input){
  const job=this.store.get('jobs',id);if(job.changeHash!==input.changeHash)throw Error('Placement approval hash mismatch');
  if(job.state==='completed')return job;
  if(this.active){if(this.active===id)return job;throw Error('Another construction job is active');}
  if(job.state!=='prepared'||job.pending)throw Error('Job must be prepared or reconciled before applying');
  this.active=id;this.update(id,{state:'applying',message:''});this.running=this.execute(id).finally(()=>{this.active=null;});return this.store.get('jobs',id);
 }
 async execute(id){
  try{
   for(;;){let job=this.store.get('jobs',id);if(job.state!=='applying')return;
    if(job.cursor>=job.changes.length){this.update(id,{state:'verifying'});const observed=await this.read(job.changes,job.worldId),conflicts=job.changes.flatMap((c,i)=>equal(after(c),observed[i])?[]:[{...c,observed:observed[i]}]);this.update(id,{state:conflicts.length?'conflict':'completed',observedHash:hash(observed),observedStates:observed,verifiedAt:new Date().toISOString(),verificationConflicts:conflicts,pending:null});return;}
    const batch=job.changes.slice(job.cursor,job.cursor+this.batchSize),current=await this.bridge.read(batch,job.worldId);
    if(this.store.get('jobs',id).state!=='applying')return;
    if(current.some((state,i)=>!equal(state,before(batch[i])))){this.update(id,{state:'conflict',message:'World changed before the next batch'});return;}
    this.update(id,{pending:{start:job.cursor,end:job.cursor+batch.length}});
    const started=performance.now(),result=await this.bridge.batch(batch,job.worldId),elapsed=performance.now()-started;
    if(!Number.isInteger(result.applied)||result.applied<0||result.applied>batch.length)throw Error('Invalid bridge acknowledgement');
    const observedAfter=await this.bridge.read(batch.slice(0,result.applied),job.worldId);
    if(observedAfter.some((state,i)=>!equal(state,after(batch[i]))))throw Error('Readback differs from intended blocks');
    const latest=this.store.get('jobs',id),cursor=job.cursor+result.applied;
    this.update(id,{cursor,pending:null,timings:[...latest.timings,{cells:result.applied,ms:Math.round(elapsed*100)/100,serverMs:result.ms}],state:latest.state==='paused'?'paused':result.applied?'applying':'conflict'});
    if(!result.applied)return;
    await new Promise(resolve=>setTimeout(resolve,50));
   }
  }catch(error){this.update(id,{state:'paused',message:error.message});}
 }
 pause(id){return this.update(id,{state:'paused',message:'Paused by operator; inspect and reconcile before continuing'});}
 async reconcile(id){
  if(this.active)throw Error('Wait for the active batch to finish');const job=this.store.get('jobs',id);if(!['paused','conflict'].includes(job.state))throw Error('Job does not need reconciliation');
  let cursor=job.cursor;
  if(job.pending){const batch=job.changes.slice(job.pending.start,job.pending.end),states=await this.read(batch,job.worldId);for(let i=0;i<batch.length;i++){if(equal(states[i],after(batch[i]))&&cursor===job.pending.start+i)cursor++;else if(!equal(states[i],before(batch[i])))throw Error('Ambiguous world state; manual review required');}}
  return this.update(id,{cursor,pending:null,state:'prepared',message:'Reconciled by explicit operator request'});
 }
 async rollback(id){
  if(this.active)throw Error('Pause and wait for the active batch before rollback');const job=this.store.get('jobs',id);if(job.pending)throw Error('Reconcile the pending batch before rollback');
  const completed=job.changes.slice(0,job.cursor),states=await this.read(completed,job.worldId),changes=[],conflicts=[];
  completed.forEach((c,i)=>{if(equal(states[i],after(c)))changes.push({...c,before:snapshot(states[i]).block,beforeSign:snapshot(states[i]).sign||null,block:c.before,sign:c.beforeSign||null});else if(!equal(states[i],before(c)))conflicts.push({...c,observed:states[i]});});
  return this.prepareChanges({changes:changes.reverse(),conflicts,artifactHash:job.artifactHash,surveyHash:job.surveyHash,worldId:job.worldId,world:job.world,idempotencyKey:'rollback-'+id+'-'+hash(states).slice(0,12),kind:'rollback'});
 }
 idle(){return this.running;}
}
module.exports={PaperBridge,ConstructionService};
