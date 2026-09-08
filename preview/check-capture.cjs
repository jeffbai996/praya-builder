const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {FileStore}=require('./workspace-store.cjs');
const {CaptureService}=require('./capture-service.cjs');
function setup(t,options={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-capture-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const store=new FileStore(root);
 const selection=store.create('selections',{name:'Trial',world:'trial',origin:[-4,60,-4],dimensions:{x:4,y:4,z:4},plot:{min:[-4,60,-4],max:[0,64,0]},frontage:[-2,61,-4],protected:[]});
 let calls=0;const bridge={status:async()=>({connected:true,world:'trial',worldId:'uuid',minimum:[-8,60,-8],maximum:[8,80,8],capabilities:{survey:1},dataVersion:4189}),survey:async cells=>{calls++;assert.ok(cells.length<=16);return {states:cells.map(c=>c.y===60?'minecraft:stone':'minecraft:air'),blockEntities:[]};}};
 return {store,selection,bridge,service:new CaptureService(store,bridge,{batchSize:16,...options}),calls:()=>calls};
}
test('complete verified capture publishes one bound survey and repeatable source content',async t=>{
 const s=setup(t);const job=await s.service.start(s.selection.id);await s.service.running;
 const done=s.store.get('captures',job.id);assert.equal(done.state,'completed');assert.equal(done.read,64);assert.equal(done.verified,64);assert.equal(s.calls(),8);
 const site=s.store.get('sites',done.siteId);assert.equal(site.blocks.length,16);assert.equal(site.worldId,'uuid');assert.deepEqual(site.origin,[-4,60,-4]);
 const again=await s.service.start(s.selection.id);await s.service.running;assert.equal(s.store.get('sites',again.id).sourceHash,site.sourceHash);
});
test('world and bounds mismatches are rejected before reading cells',async t=>{
 const s=setup(t);s.bridge.status=async()=>({connected:true,world:'other',worldId:'uuid',capabilities:{survey:1},minimum:[-8,60,-8],maximum:[8,80,8]});await assert.rejects(s.service.start(s.selection.id),/world/i);assert.equal(s.calls(),0);
 s.bridge.status=async()=>({connected:true,world:'trial',worldId:'uuid',capabilities:{survey:1},minimum:[-3,60,-8],maximum:[8,80,8]});await assert.rejects(s.service.start(s.selection.id),/reserved/i);assert.equal(s.calls(),0);
});
test('changing terrain prevents publication',async t=>{
 const s=setup(t);let count=0;s.bridge.survey=async cells=>({states:cells.map(()=>++count>64?'minecraft:dirt':'minecraft:stone'),blockEntities:[]});const j=await s.service.start(s.selection.id);await s.service.running;assert.equal(s.store.get('captures',j.id).state,'failed');assert.equal(s.store.list('sites').length,0);
});
test('cancelled in-flight reads never publish a partial site',async t=>{
 const s=setup(t);let release;s.bridge.survey=()=>new Promise(resolve=>{release=resolve;});const j=await s.service.start(s.selection.id);s.service.cancel(j.id);release({states:Array(16).fill('minecraft:stone'),blockEntities:[]});await s.service.running;assert.equal(s.store.get('captures',j.id).state,'cancelled');assert.equal(s.store.list('sites').length,0);
});
test('restart records interruption and keeps existing sites intact',t=>{
 const s=setup(t);const job=s.store.create('captures',{state:'reading',selectionId:s.selection.id,read:16,verified:0,total:64});new CaptureService(s.store,s.bridge);assert.equal(s.store.get('captures',job.id).state,'interrupted');assert.equal(s.store.list('sites').length,0);
});
test('missing chunks and malformed read responses fail without publication',async t=>{
 const s=setup(t);s.bridge.survey=async()=>{throw Error('Chunk not loaded');};let j=await s.service.start(s.selection.id);await s.service.running;assert.equal(s.store.get('captures',j.id).state,'failed');
 s.bridge.survey=async()=>({states:[],blockEntities:[]});j=await s.service.start(s.selection.id);await s.service.running;assert.equal(s.store.get('captures',j.id).state,'failed');assert.equal(s.store.list('sites').length,0);
});
test('block entities are automatically protected and capture cannot overlap construction',async t=>{
 const s=setup(t);s.bridge.survey=async cells=>({states:cells.map(()=> 'minecraft:stone'),blockEntities:[0]});const j=await s.service.start(s.selection.id);await s.service.running;assert.equal(s.store.get('sites',j.id).protected.length,4);
 const blocked=new CaptureService(s.store,s.bridge,{busy:()=>true});await assert.rejects(blocked.start(s.selection.id),/construction/i);
});

test('street entrance height comes from terrain and requires headroom',async t=>{
 const s=setup(t);s.store.update('selections',s.selection.id,s.selection.version,{...s.selection,frontageHeight:'terrain',frontage:[-2,63,-4]});
 let j=await s.service.start(s.selection.id);await s.service.running;assert.deepEqual(s.store.get('sites',j.id).frontage,[-2,61,-4]);
 s.bridge.survey=async cells=>({states:cells.map(()=> 'minecraft:stone'),blockEntities:[]});j=await s.service.start(s.selection.id);await s.service.running;assert.equal(s.store.get('captures',j.id).state,'failed');assert.equal(s.store.list('sites').length,1);
});

test('capture admission is serialized while waiting for the bridge',async t=>{
 const s=setup(t),status=await s.bridge.status();let release;s.bridge.status=()=>new Promise(resolve=>{release=resolve;});const first=s.service.start(s.selection.id);await assert.rejects(s.service.start(s.selection.id),/active/);release(status);await first;await s.service.running;
});

test('publication survives failure to save the final progress record',async t=>{
 const s=setup(t),update=s.service.update.bind(s.service);let fail=true;s.service.update=(id,patch)=>{if(patch.state==='completed'&&fail){fail=false;throw Error('Interrupted completion write');}return update(id,patch);};
 const j=await s.service.start(s.selection.id);await s.service.running;assert.equal(s.store.get('captures',j.id).state,'completed');assert.equal(s.store.get('captures',j.id).siteId,s.store.get('sites',j.id).id);
});

test('captured surroundings retain a smaller buildable plot',async t=>{
 const s=setup(t);s.store.update('selections',s.selection.id,s.selection.version,{...s.selection,plot:{min:[-3,60,-3],max:[-1,64,-1]}});
 const j=await s.service.start(s.selection.id);await s.service.running;const site=s.store.get('sites',j.id);assert.deepEqual(site.dimensions,{x:4,y:4,z:4});assert.deepEqual(site.plot,{min:[-3,60,-3],max:[-1,64,-1]});
});

test('surface presentation hides deep rock without altering the complete survey',()=>{
 const {siteView}=require('./site-view.cjs'),site={blocks:Array.from({length:40},(_,y)=>({x:0,y,z:0,block:'minecraft:stone'}))};
 const view=siteView(site,'surface');assert.equal(view.floor,36);assert.equal(view.blocks.length,4);assert.equal(site.blocks.length,40);assert.equal(siteView(site,'full').blocks.length,40);assert.throws(()=>siteView(site,'other'));
});
