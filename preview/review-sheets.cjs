// Immutable review sheets: geometry is addressed by artifact hash, while the
// diagnostics and surveyed transform that were reviewed receive their own hash.
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {meshArtifact,VERSION:meshRendererVersion}=require('./mesh.cjs');
const {diagnose,DIAGNOSTICS_VERSION}=require('./diagnostics.cjs');

const run=promisify(execFile);
const HASH=/^[a-f0-9]{64}$/;
const IMAGE=/^[a-z0-9-]+\.png$/;
const clone=value=>JSON.parse(JSON.stringify(value));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesDigest=value=>createHash('sha256').update(value).digest('hex');
const rendererVersion='review-sheet-v2-font-sign-theme';

function artifactHash(ref){
 const value=ref?.artifactHash||ref?.candidateHash||ref?.candidate?.hash||ref?.hash;
 if(!HASH.test(value||''))throw Error('An exact artifact hash is required for a review sheet');
 return value;
}
function safeName(value){if(!IMAGE.test(value||''))throw Error('Invalid review sheet image name');return value;}
function route(hash,review,file){return `/api/workspace/artifacts/${hash}/sheet/${file}?review=${review}`;}
function floorLevels(artifact){
 const levels=new Set((artifact.spaces||[]).map(space=>space.min?.[1]).filter(Number.isInteger));
 if(!levels.size){
  const rows=new Map();for(const cell of artifact.blocks)if(!/minecraft:(?:cave_)?air(?:\[|$)/.test(cell.block))rows.set(cell.y,(rows.get(cell.y)||0)+1);
  const count=y=>rows.get(y)||0,slabs=[];
  for(const y of [...rows.keys()].sort((a,b)=>a-b)){const nearby=[y-2,y-1,y+1,y+2].filter(rows.has.bind(rows)).map(count);if(count(y)>=100&&nearby.length&&count(y)>=2*Math.min(...nearby))slabs.push(y);}
  for(let index=0;index<slabs.length;index++)if(slabs[index+1]!==slabs[index]+1)levels.add(slabs[index]+1);
 }
 return [...levels].filter(y=>y>=0&&y<artifact.dimensions.y-2).sort((a,b)=>a-b).filter((y,index,all)=>index===0||y-all[index-1]>2);
}
function viewDefinitions(artifact){
 const whole=Math.min(64,artifact.dimensions.y),views=[
  ['perspective','Perspective','exterior',{preset:'perspective',projection:'perspective'}],
  ['front','Front','exterior',{preset:'front',projection:'perspective'}],
  ['side','Side','exterior',{preset:'side',projection:'perspective'}],
  ['rear','Rear','exterior',{preset:'rear',projection:'perspective'}],
  ['roof','Roof','exterior',{preset:'roof',projection:'perspective'}],
  ['street','Street','exterior',{preset:'street',projection:'perspective'}],
  ['elevation-north','North elevation','elevation',{face:'north',projection:'orthographic'}],
  ['elevation-east','East elevation','elevation',{face:'east',projection:'orthographic'}],
  ['elevation-south','South elevation','elevation',{face:'south',projection:'orthographic'}],
  ['elevation-west','West elevation','elevation',{face:'west',projection:'orthographic'}],
 ].map(([id,label,kind,details])=>({id,label,kind,ceiling:whole,file:`${id}.png`,...details}));
 for(const [index,floor] of floorLevels(artifact).entries())views.push({id:`plan-${floor}`,label:`${index===0?'Ground':`Level ${index}`} plan`,kind:'plan',floor,ceiling:Math.min(artifact.dimensions.y,floor+2),projection:'orthographic',file:`plan-${floor}.png`});
 return views;
}
function markerDiagnostics(diagnostics,view){
 if(view.kind!=='plan')return diagnostics;
 return diagnostics.filter(entry=>Array.isArray(entry.at)&&entry.at[1]>=view.floor-1&&entry.at[1]<view.ceiling);
}
function atomicBytes(file,bytes){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 const temp=`${file}.${randomUUID()}.tmp`;fs.writeFileSync(temp,bytes,{mode:0o600});
 try{fs.linkSync(temp,file);fs.unlinkSync(temp);}catch(error){try{fs.unlinkSync(temp);}catch{}if(error.code==='EEXIST'){
   const existing=fs.readFileSync(file);if(!existing.equals(Buffer.from(bytes)))throw Error('Review cache fingerprint collision');return;
  }throw error;}
}
function atomicJSON(file,value){atomicBytes(file,Buffer.from(JSON.stringify(value,null,2)+'\n'));}
function reviewInputPath(root,hash,review){return path.join(root,'sheets',hash,`${review}.review.json`);}
function reviewDirectory(root,hash,review){return path.join(root,'sheets',hash,review);}
function validateManifestAt(directory,hash,review,manifest){
 if(!manifest||manifest.artifactHash!==hash||manifest.reviewHash!==review||!Array.isArray(manifest.views)||!manifest.views.length)throw Error('Invalid review sheet manifest');
 const names=new Set();for(const view of manifest.views.flatMap(v=>v.dark?[v,v.dark]:[v])){safeName(view.file);if(names.has(view.file)||view.url!==route(hash,review,view.file)||!HASH.test(view.sha256||''))throw Error('Invalid review sheet image manifest');names.add(view.file);const bytes=fs.readFileSync(path.join(directory,view.file));if(bytesDigest(bytes)!==view.sha256)throw Error('Review sheet image checksum mismatch');}
}
function validateTransform(value){if(value==null)return null;if(!Array.isArray(value.origin)||value.origin.length!==3||!value.origin.every(Number.isInteger)||!Number.isInteger(value.turns)||value.turns<0||value.turns>3)throw Error('Invalid review transform');return clone(value);}

class ReviewSheetService{
 constructor({store,catalogue=null,baseUrl='http://127.0.0.1:8091',renderWorker=null,rendererVersion:version=rendererVersion,maxQueue=4}={}){
  if(!store?.root||typeof store.getArtifact!=='function')throw Error('A workspace store is required');
  if(!Number.isInteger(maxQueue)||maxQueue<1||maxQueue>4)throw Error('Review queue must be between 1 and 4');
  this.store=store;this.catalogue=catalogue;this.baseUrl=baseUrl.replace(/\/$/,'');this.rendererVersion=version;this.maxQueue=maxQueue;
  this.worker=renderWorker||this.runWorker.bind(this);this.tail=Promise.resolve();this.pending=0;this.active=new Map();
 }
 getArtifact(hash){
  try{return this.store.getArtifact(hash);}catch(error){if(error.status!==404||!this.catalogue)throw error;}
  const values=this.catalogue instanceof Map?[...this.catalogue.values()]:typeof this.catalogue==='function'?[this.catalogue(hash)]:Object.values(this.catalogue||{});
  const artifact=values.find(value=>value?.hash===hash);if(!artifact){const error=Error('Artifact not found');error.status=404;throw error;}return artifact;
 }
 record(ref){
  if(typeof ref==='string'){
   try{return this.store.get('drafts',ref);}catch(error){if(error.status!==404)throw error;return this.store.get('revisions',ref);}
  }
  if(!ref||typeof ref!=='object')throw Error('A draft or revision reference is required');return ref;
 }
 site(ref){if(!ref.siteId)return null;return this.store.get('sites',ref.siteId);}
 snapshot(ref,artifact){
  const site=this.site(ref),historical=Array.isArray(ref.diagnostics)&&Number.isInteger(ref.diagnosticsVersion);
  const diagnostics=historical?clone(ref.diagnostics):diagnose(artifact,site,ref.transform||null);
  return {...(ref.reviewLabel?{reviewLabel:String(ref.reviewLabel).slice(0,120)}:{}),artifactHash:artifact.hash,diagnostics,diagnosticsVersion:historical?ref.diagnosticsVersion:DIAGNOSTICS_VERSION,diagnosticsSource:historical?'saved-snapshot':'current-rules',surveyHash:ref.surveyHash||site?.hash||null,transform:validateTransform(ref.transform||null),rendererVersion:this.rendererVersion};
 }
 defaultSnapshot(artifact){return {artifactHash:artifact.hash,diagnostics:[],diagnosticsVersion:null,diagnosticsSource:'artifact-only',surveyHash:null,transform:null,rendererVersion:this.rendererVersion};}
 persist(snapshot){
  const reviewHash=digest({...(snapshot.reviewLabel?{reviewLabel:snapshot.reviewLabel}:{}),artifactHash:snapshot.artifactHash,diagnostics:snapshot.diagnostics,diagnosticsVersion:snapshot.diagnosticsVersion,diagnosticsSource:snapshot.diagnosticsSource,surveyHash:snapshot.surveyHash,transform:snapshot.transform,rendererVersion:snapshot.rendererVersion});
  const review={schemaVersion:1,reviewHash,...snapshot};atomicJSON(reviewInputPath(this.store.root,snapshot.artifactHash,reviewHash),review);return review;
 }
 describe(ref){
  const record=this.record(ref),hash=artifactHash(record),artifact=this.getArtifact(hash),review=this.persist(this.snapshot(record,artifact));
  return {artifactHash:hash,reviewHash:review.reviewHash,index:`/api/workspace/artifacts/${hash}/sheet/index.json?review=${review.reviewHash}`,diagnosticsVersion:review.diagnosticsVersion,diagnosticsSource:review.diagnosticsSource};
 }
 defaultDescribe(hash){const artifact=this.getArtifact(hash),review=this.persist(this.defaultSnapshot(artifact));return {artifactHash:hash,reviewHash:review.reviewHash,index:`/api/workspace/artifacts/${hash}/sheet/index.json?review=${review.reviewHash}`,diagnosticsVersion:null,diagnosticsSource:'artifact-only'};}
 getReview(hash,review){
  if(!HASH.test(hash||'')||!HASH.test(review||''))throw Error('Invalid review sheet identity');
  try{return JSON.parse(fs.readFileSync(reviewInputPath(this.store.root,hash,review),'utf8'));}catch(error){if(error.code==='ENOENT'){const missing=Error('Review context not found');missing.status=404;throw missing;}throw error;}
 }
 readIndex(hash,review){
  const file=path.join(reviewDirectory(this.store.root,hash,review),'index.json');
  try{const manifest=JSON.parse(fs.readFileSync(file,'utf8'));this.validateManifest(hash,review,manifest);return manifest;}catch(error){if(error.code==='ENOENT')return null;throw error;}
 }
 validateManifest(hash,review,manifest){
  validateManifestAt(reviewDirectory(this.store.root,hash,review),hash,review,manifest);
 }
 enqueue(work){
  if(this.pending>=this.maxQueue){const error=Error('Review render queue is full; retry after current work finishes');error.status=429;return Promise.reject(error);}
  this.pending++;const task=this.tail.then(work);this.tail=task.catch(()=>{});return task.finally(()=>this.pending--);
 }
 async ensure(hash,requestedReview=null){
  if(!HASH.test(hash||''))throw Error('Invalid artifact hash');
  const descriptor=requestedReview?{artifactHash:hash,reviewHash:requestedReview}:this.defaultDescribe(hash),review=descriptor.reviewHash;
  if(!HASH.test(review||''))throw Error('Invalid review hash');
  const current=this.readIndex(hash,review);if(current)return current;
  const key=`${hash}/${review}`;if(this.active.has(key))return this.active.get(key);
  const task=this.enqueue(async()=>{
   const existing=this.readIndex(hash,review);if(existing)return existing;
   const artifact=this.getArtifact(hash),input=this.getReview(hash,review),base=path.join(this.store.root,'sheets',hash),staging=path.join(base,`.${review}.${randomUUID()}.staging`),final=reviewDirectory(this.store.root,hash,review);
   fs.mkdirSync(staging,{recursive:true,mode:0o700});
   try{
    await this.worker({artifact,review:input,views:viewDefinitions(artifact),baseUrl:this.baseUrl,outputDir:staging,rendererVersion:this.rendererVersion});
    const manifest=this.readIndexFrom(staging,hash,review);if(fs.existsSync(final)){const cached=this.readIndex(hash,review);if(cached)return cached;throw Error('Incomplete review cache already exists');}
    fs.renameSync(staging,final);return manifest;
   }finally{if(fs.existsSync(staging))fs.rmSync(staging,{recursive:true,force:true});}
  });
  this.active.set(key,task);try{return await task;}finally{this.active.delete(key);}
 }
 readIndexFrom(directory,hash,review){
  const file=path.join(directory,'index.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8'));validateManifestAt(directory,hash,review,manifest);return manifest;
 }
 readImage(hash,review,file){
  safeName(file);const manifest=this.readIndex(hash,review);if(!manifest||!manifest.views.some(view=>view.file===file||view.dark?.file===file)){const error=Error('Review sheet image not found');error.status=404;throw error;}return fs.readFileSync(path.join(reviewDirectory(this.store.root,hash,review),file));
 }
 async runWorker(input){
  const file=path.join(input.outputDir,'input.json');atomicJSON(file,input);
  const worker=path.join(__dirname,'review-sheet-worker.cjs');
  try{await run(process.execPath,[worker,file],{timeout:180000,killSignal:'SIGTERM',maxBuffer:1024*1024});}catch(error){throw Error(`Review sheet render failed: ${(error.stderr||error.message||'worker failed').trim().slice(0,2000)}`);}
  finally{try{fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}}
 }
}

module.exports={ReviewSheetService,rendererVersion,viewDefinitions,markerDiagnostics,digest,route};
