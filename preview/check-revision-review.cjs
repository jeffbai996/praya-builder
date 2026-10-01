const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {FileStore}=require('./workspace-store.cjs');
const {RevisionReview}=require('./revision-review.cjs');
function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'revision-review-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const store=new FileStore(root);
 const plan={plan_id:'fixture',revision:'r1',name:'Fixture',components:[{id:'wall'},{id:'roof'}],palette:{wall:'stone',roof:'stone'}};
 const artifact=p=>({hash:p.palette.wall+':'+p.palette.roof,blocks:[{x:0,y:0,z:0,block:p.palette.wall,component:'wall'},{x:0,y:1,z:0,block:p.palette.roof,component:'roof'}]});
 const d=store.create('drafts',{project:'fixture:unassigned',plan,candidate:artifact(plan),siteId:null,parentHash:null});
 const request=store.create('requests',{draftId:d.id,baselineHash:d.candidate.hash,expectedVersion:d.version,componentId:'wall',instruction:'Improve this wall'});
 const service={serialized:fn=>fn(),context:id=>({draftId:id}),evaluate:async p=>({candidate:artifact(p),valid:true,diagnostics:[]})};
 return {store,d,request,service,review:new RevisionReview(store,service),plan:()=>JSON.parse(JSON.stringify(plan))};
}
test('component candidates compare changes and accept one immutable successor without rewriting the baseline',async t=>{
 const {store,d,request,review,plan}=setup(t),p=plan();p.palette.wall='quartz';const before=JSON.stringify(store.get('drafts',d.id));
 const c=await review.submit(request.id,{plan:p,author:{agent:'test'}});assert.equal(c.valid,true);assert.equal(c.changes.length,1);assert.equal(c.changes[0].component,'wall');
 const r=await review.accept(c.id);assert.equal(r.parentHash,d.candidate.hash);assert.equal(r.candidateId,c.id);assert.equal((await review.accept(c.id)).id,r.id);assert.equal(store.list('revisions').length,1);assert.equal(JSON.stringify(store.get('drafts',d.id)),before);
});
test('candidate scope blocks changes to other components',async t=>{
 const {request,review,plan}=setup(t),p=plan();p.palette.wall='quartz';p.palette.roof='glass';const c=await review.submit(request.id,{plan:p});assert.equal(c.valid,false);assert.ok(c.diagnostics.some(d=>d.rule==='revision.scope'));await assert.rejects(review.accept(c.id),/diagnostics/);
});
test('stale requests cannot submit or accept, including a draft edit while compilation yields',async t=>{
 const {store,d,request,review,service,plan}=setup(t),p=plan();p.palette.wall='quartz';
 const c=await review.submit(request.id,{plan:p});const evaluate=service.evaluate;
 service.evaluate=async p=>{const result=await evaluate(p);store.update('drafts',d.id,d.version,{...d,candidate:{...d.candidate,hash:'newer'}});return result;};
 await assert.rejects(review.submit(request.id,{plan:p}),e=>e.status===409);await assert.rejects(review.accept(c.id),e=>e.status===409);assert.equal(store.list('revisions').length,0);
});
test('compile failures stay invalid and an unrelated saved successor blocks acceptance',async t=>{
 const {store,d,request,review,service,plan}=setup(t),p=plan();p.palette.wall='quartz';const c=await review.submit(request.id,{plan:p});
 store.create('revisions',{project:d.project,artifactHash:'another-successor'});await assert.rejects(review.accept(c.id),e=>e.status===409);
 service.evaluate=async()=>{throw Error('Invalid geometry');};const failed=await review.submit(request.id,{plan:p});assert.equal(failed.valid,false);assert.equal(failed.artifactHash,null);await assert.rejects(review.accept(failed.id),/diagnostics/);
});
