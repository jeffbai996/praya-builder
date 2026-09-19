const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {FileStore}=require('./workspace-store.cjs');
const {DesignService}=require('./design-service.cjs');
const {LIMITS,siteCaps}=require('./draft-context.cjs');

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dimensions={x:4,y:6,z:3};
const transform={origin:[100,60,200],turns:0};

function worldPoint(point,placement){
 const [x,y,z]=point,[ox,oy,oz]=placement.origin;
 switch(placement.turns){
  case 1:return [ox+dimensions.z-1-z,oy+y,oz+x];
  case 2:return [ox+dimensions.x-1-x,oy+y,oz+dimensions.z-1-z];
  case 3:return [ox+z,oy+y,oz+dimensions.x-1-x];
  default:return [ox+x,oy+y,oz+z];
 }
}
function worldBox(planBox,placement){
 const points=[];
 for(const x of [planBox.min[0],planBox.max[0]-1])for(const y of [planBox.min[1],planBox.max[1]-1])for(const z of [planBox.min[2],planBox.max[2]-1])points.push(worldPoint([x,y,z],placement));
 return {min:[0,1,2].map(i=>Math.min(...points.map(point=>point[i]))),max:[0,1,2].map(i=>Math.max(...points.map(point=>point[i]))+1)};
}
function siteFor(placement){
 const survey=worldBox({min:[-1,-2,-1],max:[5,8,4]},placement);
 const plot=worldBox({min:[0,0,0],max:[4,6,3]},placement);
 const frontage=worldPoint([1,1,0],placement);
 const protectedBox=worldBox({min:[2,2,1],max:[3,4,2]},placement);
 const support=worldPoint([1,0,0],placement);
 return {
  name:'Contract fixture',world:'isolated-test',origin:survey.min,
  dimensions:{x:survey.max[0]-survey.min[0],y:survey.max[1]-survey.min[1],z:survey.max[2]-survey.min[2]},
  plot,frontage,protected:[protectedBox],blocks:[{x:support[0]-survey.min[0],y:support[1]-survey.min[1],z:support[2]-survey.min[2],block:'minecraft:stone',component:'context'}],
 };
}
function compiler(plan){
 const content={schema_version:1,plan_id:plan.plan_id,revision:plan.revision,name:'Contract candidate',description:'',dimensions,components:[{id:'shell'}],spaces:[],blocks:[{x:0,y:0,z:0,block:plan.palette.wall,component:'shell'}]};
 return Promise.resolve({...content,hash:hash(content)});
}
function plan(){return {schema_version:1,plan_id:'agent-contract',revision:'r0',name:'Agent contract',palette:{wall:'minecraft:stone'},components:[{id:'shell',operations:[]}],spaces:[]};}

test('site caps are plan-local and invert all four quarter-turns',()=>{
 for(const turns of [0,1,2,3]){
  const placement={...transform,turns},caps=siteCaps(siteFor(placement),{dimensions},placement);
  assert.equal(caps.coordinateSystem,'plan');
  assert.equal(caps.boundsConvention,'min inclusive, max exclusive');
  assert.equal(caps.surveyTopExclusive,68);
  assert.equal(caps.surveyTopPlanExclusive,8);
  assert.deepEqual(caps.survey,{min:[-1,-2,-1],max:[5,8,4]});
  assert.deepEqual(caps.plot,{min:[0,0,0],max:[4,6,3]});
  assert.deepEqual(caps.frontage,[1,1,0]);
  assert.deepEqual(caps.protected,[{min:[2,2,1],max:[3,4,2]}]);
 }
});

test('edit provenance is attributed to its history entry and survives save, undo, and redo',async()=>{
 const store=new FileStore(fs.mkdtempSync(path.join(os.tmpdir(),'builder-agent-contract-')));
 const service=new DesignService(store,{compile:compiler});
 const original={agent:'architect-a',model:'model-a',effort:'medium',note:'initial plan'};
 const editor={agent:'architect-b',model:'model-b',effort:'high',note:'window revision'};
 const placement={...transform};
 const site=store.create('sites',siteFor(placement));
 let draft=await service.createDraft({plan:plan(),siteId:site.id,transform:placement,author:original});
 assert.deepEqual(draft.author,original);
 assert.deepEqual(draft.history[0].author,original);
 draft=await service.editDraft(draft.id,{expectedVersion:draft.version,palette:{wall:'minecraft:quartz_block'},author:editor});
 assert.deepEqual(draft.author,editor);
 assert.deepEqual(draft.history.at(-1).author,editor);
 const saved=service.save(draft.id,{expectedVersion:draft.version,candidateHash:draft.candidate.hash,idempotencyKey:'agent-contract-save'});
 assert.deepEqual(saved.author,editor);
 const undo=await service.history(draft.id,{expectedVersion:draft.version,direction:'undo'});
 assert.deepEqual(undo.author,original);
 const redo=await service.history(undo.id,{expectedVersion:undo.version,direction:'redo'});
 assert.deepEqual(redo.author,editor);
 assert.deepEqual(store.get('revisions',saved.id).author,editor);
 await assert.rejects(()=>service.editDraft(redo.id,{expectedVersion:redo.version,author:{agent:'architect-c',unexpected:'not allowed'}}),/Unknown author field/);
});

test('saved revisions snapshot versioned diagnostics and context exposes fixed limits',async()=>{
 const store=new FileStore(fs.mkdtempSync(path.join(os.tmpdir(),'builder-agent-diagnostics-')));
 const service=new DesignService(store,{compile:compiler});
 const placement={...transform,turns:2},site=store.create('sites',siteFor(placement));
 let draft=await service.createDraft({plan:plan(),siteId:site.id,transform:placement,author:{agent:'architect-a',model:'model-a',effort:'medium'}});
 assert.ok(Number.isInteger(draft.diagnosticsVersion)&&draft.diagnosticsVersion>=1);
 assert.ok(draft.diagnostics.length>0,'fixture must retain at least one warning to prove save snapshots it');
 for(const diagnostic of draft.diagnostics){
  assert.ok(/^[a-z]+(?:[.-][a-z0-9]+)+$/.test(diagnostic.rule));
  assert.ok(Number.isInteger(diagnostic.version)&&diagnostic.version>=1);
  assert.ok(['error','warning','info'].includes(diagnostic.severity));
  assert.ok(Object.hasOwn(diagnostic,'component'));
  assert.ok(Object.hasOwn(diagnostic,'at'));
  assert.equal(typeof diagnostic.message,'string');
  assert.equal(typeof diagnostic.hint,'string');
 }
 const expectedDiagnostics=structuredClone(draft.diagnostics),expectedVersion=draft.diagnosticsVersion;
 const saved=service.save(draft.id,{expectedVersion:draft.version,candidateHash:draft.candidate.hash,idempotencyKey:'diagnostic-snapshot'});
 assert.equal(saved.diagnosticsVersion,expectedVersion);
 assert.deepEqual(saved.diagnostics,expectedDiagnostics);
 draft=await service.editDraft(draft.id,{expectedVersion:draft.version,palette:{wall:'minecraft:quartz_block'}});
 const revision=store.get('revisions',saved.id);
 assert.equal(revision.diagnosticsVersion,expectedVersion);
 assert.deepEqual(revision.diagnostics,expectedDiagnostics);
 const context=service.context(draft.id);
 assert.deepEqual(context.limits,LIMITS);
 assert.deepEqual(context.site.caps,siteCaps(store.get('sites',site.id),draft.candidate,placement));
});

test('saving actor is retained separately from the design author',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-save-actor-'));
 try{
  const store=new FileStore(root),service=new DesignService(store,{compile:compiler});
  const designer={agent:'designer',model:'design-model'},actor={agent:'reviewer',model:'review-model'};
  const draft=await service.createDraft({plan:plan(),author:designer});
  const saved=service.save(draft.id,{expectedVersion:draft.version,candidateHash:draft.candidate.hash,idempotencyKey:'actor-fixture',author:actor});
  assert.deepEqual(saved.author,designer);assert.deepEqual(saved.savedBy,actor);
  assert.deepEqual(store.get('revisions',saved.id).savedBy,actor);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
