const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {FileStore}=require('./workspace-store.cjs');
const {ReviewSheetService,route}=require('./review-sheets.cjs');

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesHash=value=>createHash('sha256').update(value).digest('hex');
function artifact(){const content={schema_version:1,plan_id:'review-sheet-fixture',revision:'r0',name:'Review fixture',description:'',dimensions:{x:4,y:6,z:4},components:[{id:'shell'}],spaces:[{id:'room',min:[1,1,1],max:[3,3,3]}],blocks:[{x:0,y:0,z:0,block:'minecraft:stone',component:'shell'}]};return {...content,hash:hash(content)};}
function reviewRef(artifactHash,overrides={}){return {artifactHash,diagnosticsVersion:1,diagnostics:[{rule:'support.floating',version:1,severity:'warning',component:'shell',at:[0,0,0],message:'Fixture warning',hint:'Fix it.'}],surveyHash:'a'.repeat(64),transform:{origin:[10,64,20],turns:0},...overrides};}
function fakeWorker(calls,{wait=null,partial=false}={}){return async({artifact,review,views,outputDir,rendererVersion})=>{
 calls.push({artifact,review,views,outputDir});if(wait)await wait;
 const made=[];
 for(const view of views){const bytes=Buffer.from(`png:${artifact.hash}:${review.reviewHash}:${view.id}`);fs.writeFileSync(path.join(outputDir,view.file),bytes);made.push({...view,url:route(artifact.hash,review.reviewHash,view.file),sha256:bytesHash(bytes),markers:view.kind==='plan'?review.diagnostics:[],legend:view.kind==='plan'?['shell']:[]});if(partial)throw Error('worker failed after its first staged image');}
 fs.writeFileSync(path.join(outputDir,'index.json'),JSON.stringify({schemaVersion:1,artifactHash:artifact.hash,reviewHash:review.reviewHash,rendererVersion,diagnosticsVersion:review.diagnosticsVersion,diagnosticsSource:review.diagnosticsSource,views:made}));
 };}
function makeService(worker){const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-review-sheets-')),store=new FileStore(root),candidate=artifact();store.putArtifact(candidate);return {root,store,candidate,service:new ReviewSheetService({store,baseUrl:'http://127.0.0.1:8092',renderWorker:worker})};}

test('review identity binds artifact geometry to diagnostic, survey, transform, and renderer context',()=>{
 const calls=[],{candidate,service}=makeService(fakeWorker(calls));
 const original=service.describe(reviewRef(candidate.hash));
 const moved=service.describe(reviewRef(candidate.hash,{transform:{origin:[11,64,20],turns:1}}));
 const resurveyed=service.describe(reviewRef(candidate.hash,{surveyHash:'b'.repeat(64)}));
 const rediagnosed=service.describe(reviewRef(candidate.hash,{diagnostics:[{rule:'support.floating',version:1,severity:'warning',component:'shell',at:[1,0,0],message:'A different cell',hint:'Fix it.'}]}));
 assert.notEqual(original.reviewHash,moved.reviewHash);
 assert.notEqual(original.reviewHash,resurveyed.reviewHash);
 assert.notEqual(original.reviewHash,rediagnosed.reviewHash);
 assert.equal(original.index,`/api/workspace/artifacts/${candidate.hash}/sheet/index.json?review=${original.reviewHash}`);
 assert.equal(original.diagnosticsSource,'saved-snapshot');
 const legacy=service.describe({artifactHash:candidate.hash,transform:{origin:[10,64,20],turns:0}});
 assert.equal(legacy.diagnosticsSource,'current-rules');
 assert.equal(service.getReview(candidate.hash,legacy.reviewHash).diagnosticsSource,'current-rules');
});

test('complete manifests publish atomically, cache by review identity, and expose verified bytes',async()=>{
 const calls=[],fixture=makeService(fakeWorker(calls));
 const descriptor=fixture.service.describe(reviewRef(fixture.candidate.hash));
 const [first,second]=await Promise.all([fixture.service.ensure(descriptor.artifactHash,descriptor.reviewHash),fixture.service.ensure(descriptor.artifactHash,descriptor.reviewHash)]);
 assert.equal(calls.length,1,'one in-flight render serves identical review identity');
 assert.deepEqual(first,second);assert.equal(first.views.length,11,'six exterior, four elevations, and one occupied-floor cut');
 const image=first.views.find(view=>view.kind==='plan');assert.deepEqual(fixture.service.readImage(descriptor.artifactHash,descriptor.reviewHash,image.file),Buffer.from(`png:${fixture.candidate.hash}:${descriptor.reviewHash}:${image.id}`));
 assert.deepEqual(image.markers,reviewRef(fixture.candidate.hash).diagnostics);
 assert.ok(fs.existsSync(path.join(fixture.root,'sheets',fixture.candidate.hash,descriptor.reviewHash,'index.json')));
 assert.equal(fs.readdirSync(path.join(fixture.root,'sheets',fixture.candidate.hash)).filter(name=>name.includes('.staging')).length,0);
});

test('failed workers leave no readable partial cache and queue admission is bounded',async()=>{
 const calls=[],broken=makeService(fakeWorker(calls,{partial:true})),descriptor=broken.service.describe(reviewRef(broken.candidate.hash));
 await assert.rejects(()=>broken.service.ensure(descriptor.artifactHash,descriptor.reviewHash),/worker failed/);
 assert.equal(broken.service.readIndex(descriptor.artifactHash,descriptor.reviewHash),null);
 assert.equal(fs.existsSync(path.join(broken.root,'sheets',broken.candidate.hash,descriptor.reviewHash)),false);
 let release;const gate=new Promise(resolve=>{release=resolve;});const queuedCalls=[],queued=makeService(fakeWorker(queuedCalls,{wait:gate}));
 const refs=[0,1,2,3,4].map(index=>queued.service.describe(reviewRef(queued.candidate.hash,{transform:{origin:[10+index,64,20],turns:index%4}})));
 const jobs=refs.slice(0,4).map(ref=>queued.service.ensure(ref.artifactHash,ref.reviewHash));
 await assert.rejects(()=>queued.service.ensure(refs[4].artifactHash,refs[4].reviewHash),error=>error.status===429);
 release();await Promise.all(jobs);assert.equal(queuedCalls.length,4);
});
