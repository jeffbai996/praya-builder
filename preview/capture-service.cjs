const fs=require('node:fs');
const {hash,air,surveyFrontage}=require('./sites.cjs');
const {stateBlock}=require('./mesh.cjs');
const point=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&Math.abs(n)<=30000000);
const box=b=>b&&point(b.min)&&point(b.max)&&b.min.every((n,i)=>n<b.max[i]);
const activeStates=new Set(['reading','verifying']);
function captureBounds(selection,status){
 if(!status.connected||!status.worldId||status.world!==selection.world)throw Error('Selection world differs from the connected capture world');
 if(status.capabilities?.survey!==1)throw Error('This server adapter needs the automatic survey update');
 const dims=['x','y','z'].map(a=>selection.dimensions?.[a]);
 if(!point(selection.origin)||!box(selection.plot)||!box({min:status.minimum,max:status.maximum})||!dims.every(n=>Number.isInteger(n)&&n>0&&n<=128)||dims.reduce((a,b)=>a*b,1)>262144)throw Error('Invalid capture bounds or survey budget');
 if(selection.origin.some((n,i)=>n<status.minimum[i]||n+dims[i]>status.maximum[i]||selection.plot.min[i]<n||selection.plot.max[i]>n+dims[i]))throw Error('Capture is outside the reserved server area');
 return dims.reduce((a,b)=>a*b,1);
}
function cellsAt(selection,start,count){
 const {x:w,z:d}=selection.dimensions,[ox,oy,oz]=selection.origin;
 return Array.from({length:count},(_,i)=>{const n=start+i;return {x:ox+n%w,y:oy+Math.floor(n/(w*d)),z:oz+Math.floor(n/w)%d};});
}
class CaptureService{
 constructor(store,bridge,{batchSize=128,busy=()=>false}={}){
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>128)throw Error('Invalid capture batch size');
  this.store=store;this.bridge=bridge;this.batchSize=batchSize;this.otherBusy=busy;this.active=null;this.starting=false;this.running=Promise.resolve();
  for(const job of store.list('captures'))if(activeStates.has(job.state)){
   const published=fs.existsSync(store.file('sites',job.id))?store.get('sites',job.id):null;
   this.update(job.id,published?.captureId===job.id?{state:'completed',siteId:job.id}:{state:'interrupted',message:'Capture interrupted by restart. Start a fresh capture.'});
  }
 }
 get busy(){return this.starting||Boolean(this.active);}
 async status(){try{return await this.bridge.status();}catch(error){return {connected:false,message:error.message};}}
 update(id,patch){const old=this.store.get('captures',id);return this.store.update('captures',id,old.version,{...old,...patch});}
 async start(selectionId){
  if(this.busy||this.otherBusy())throw Error('Another capture or construction job is active');
  this.starting=true;
  try{
   const selection=this.store.get('selections',selectionId),status=await this.bridge.status(),total=captureBounds(selection,status);
   if(this.otherBusy())throw Error('Construction started before capture');
   const job=this.store.create('captures',{schemaVersion:1,selectionId,selection,world:status.world,worldId:status.worldId,dataVersion:status.dataVersion,state:'reading',read:0,verified:0,total,batchSize:this.batchSize,startedAt:new Date().toISOString()});
   this.active=job.id;this.running=this.execute(job.id).finally(()=>{this.active=null;});return job;
  }finally{this.starting=false;}
 }
 cancel(id){const job=this.store.get('captures',id);return activeStates.has(job.state)?this.update(id,{state:'cancelled',message:'Capture cancelled. No survey was published.'}):job;}
 chunkId(id,offset){return id+'-'+String(offset).padStart(6,'0');}
 async execute(id){
  try{
   let job=this.store.get('captures',id);
   for(const pass of ['reading','verifying']){
    if(!activeStates.has(this.store.get('captures',id).state))return;
    this.update(id,{state:pass});
    for(let offset=0;offset<job.total;offset+=job.batchSize){
     if(!activeStates.has(this.store.get('captures',id).state))return;
     if(this.otherBusy())throw Error('Construction overlaps this capture; capture again after placement');
     const cells=cellsAt(job.selection,offset,Math.min(job.batchSize,job.total-offset));
     const result=await this.bridge.survey(cells,job.worldId);
     if(!activeStates.has(this.store.get('captures',id).state))return;
     if(!Array.isArray(result.states)||result.states.length!==cells.length||!Array.isArray(result.blockEntities)||result.blockEntities.some(n=>!Number.isInteger(n)||n<0||n>=cells.length)||new Set(result.blockEntities).size!==result.blockEntities.length)throw Error('Incomplete survey batch');
     for(const state of result.states)stateBlock(state);
     const value={states:result.states,blockEntities:[...result.blockEntities].sort((a,b)=>a-b)},chunkId=this.chunkId(id,offset);
     if(pass==='reading')this.store.write(this.store.file('capture-chunks',chunkId),value,true);
     else if(hash(this.store.get('capture-chunks',chunkId))!==hash(value))throw Error('Blocks changed during capture. Capture a fresh survey.');
     this.update(id,{[pass==='reading'?'read':'verified']:offset+cells.length});
    }
   }
   const states=[],protectedAreas=[...job.selection.protected],blocks=[];
   for(let offset=0;offset<job.total;offset+=job.batchSize){
    const chunk=this.store.get('capture-chunks',this.chunkId(id,offset)),cells=cellsAt(job.selection,offset,chunk.states.length);
    states.push(...chunk.states);
    for(const i of chunk.blockEntities){const c=cells[i],min=[c.x,c.y,c.z];protectedAreas.push({min,max:min.map(n=>n+1)});}
    cells.forEach((c,i)=>{if(!air(chunk.states[i]))blocks.push({x:c.x-job.selection.origin[0],y:c.y-job.selection.origin[1],z:c.z-job.selection.origin[2],block:chunk.states[i],component:'context'});});
   }
   const frontage=surveyFrontage(job.selection,blocks,job.selection.dimensions);
   const finishedAt=new Date().toISOString(),sourceHash=hash({worldId:job.worldId,origin:job.selection.origin,dimensions:job.selection.dimensions,states,protected:protectedAreas});
   const content={schemaVersion:1,name:job.selection.name,world:job.world,worldId:job.worldId,origin:job.selection.origin,dimensions:job.selection.dimensions,plot:job.selection.plot,frontage:job.selection.frontage,protected:protectedAreas,capturedAt:finishedAt,captureStartedAt:job.startedAt,captureFinishedAt:finishedAt,selectionId:job.selectionId,captureId:id,source:'paper-survey',sourceHash,dataVersion:job.dataVersion,complete:true,blocks,warnings:['Two matching sequential reads; this is not an atomic world snapshot. Placement rechecks the affected blocks.','Block-entity contents are not imported; their cells are protected from construction.']};
   content.frontage=frontage;
   this.store.write(this.store.file('sites',id),{...content,hash:hash(content),id,version:1,createdAt:finishedAt},true);
   this.update(id,{state:'completed',siteId:id,finishedAt,message:'Survey verified and ready for design.'});
  }catch(error){try{const published=fs.existsSync(this.store.file('sites',id))&&this.store.get('sites',id).captureId===id;this.update(id,published?{state:'completed',siteId:id,message:'Verified survey published; completion record recovered.'}:{state:'failed',message:error.message});}catch(storageError){console.error('Capture status persistence failed:',storageError.message);}}
 }
}
module.exports={CaptureService,captureBounds,cellsAt};
