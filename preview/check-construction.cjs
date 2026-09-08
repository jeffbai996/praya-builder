const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {FileStore}=require('./workspace-store.cjs');const {ConstructionService}=require('./construction-service.cjs');
function setup(){const store=new FileStore(fs.mkdtempSync(path.join(os.tmpdir(),'builder-jobs-'))),world=new Map(),bridge={status:async()=>({connected:true,world:'builder-isolated',worldId:'test-world'}),read:async cells=>cells.map(c=>world.get(`${c.x},${c.y},${c.z}`)||'minecraft:air'),batch:async changes=>{let applied=0;for(const c of changes){const key=`${c.x},${c.y},${c.z}`;if((world.get(key)||'minecraft:air')!==c.before)break;world.set(key,c.block);applied++;}return {applied};}};return {store,world,bridge,service:new ConstructionService(store,bridge,{batchSize:2})};}
const changes=Array.from({length:5},(_,x)=>({x,y:60,z:0,before:'minecraft:air',block:'minecraft:stone',component:'wall'}));
test('placement is idempotent, verifies readback, and rollback preserves a later unrelated edit',async()=>{
 const {service,store,world}=setup();let job=await service.prepareChanges({changes,artifactHash:'a'.repeat(64),surveyHash:'b'.repeat(64),worldId:'test-world',world:'builder-isolated',idempotencyKey:'one'});
 assert.equal((await service.prepareChanges({changes,artifactHash:'a'.repeat(64),surveyHash:'b'.repeat(64),worldId:'test-world',world:'builder-isolated',idempotencyKey:'one'})).id,job.id);
 assert.throws(()=>service.apply(job.id,{changeHash:'wrong'}),/hash/i);
 service.apply(job.id,{changeHash:job.changeHash});await service.idle();job=store.get('jobs',job.id);assert.equal(job.state,'completed');assert.equal(job.cursor,5);
 world.set('2,60,0','minecraft:gold_block');const rollback=await service.rollback(job.id);assert.equal(rollback.conflicts.length,1);
 service.apply(rollback.id,{changeHash:rollback.changeHash});await service.idle();assert.equal(world.get('2,60,0'),'minecraft:gold_block');assert.equal(world.get('0,60,0'),'minecraft:air');
});
test('stale world state stops placement before overwriting it',async()=>{
 const {service,store,world}=setup();const job=await service.prepareChanges({changes,artifactHash:'a',surveyHash:'b',worldId:'test-world',world:'builder-isolated',idempotencyKey:'stale'});
 world.set('0,60,0','minecraft:gold_block');service.apply(job.id,{changeHash:job.changeHash});await service.idle();assert.equal(store.get('jobs',job.id).state,'conflict');assert.equal(world.get('0,60,0'),'minecraft:gold_block');
});
test('restart pauses uncertain jobs and explicit reconciliation continues without duplicate writes',async()=>{
 const {service,store,world,bridge}=setup();let job=await service.prepareChanges({changes,artifactHash:'a',surveyHash:'b',worldId:'test-world',world:'builder-isolated',idempotencyKey:'restart'});
 store.update('jobs',job.id,job.version,{...job,state:'applying',pending:{start:0,end:2}});world.set('0,60,0','minecraft:stone');
 const resumed=new ConstructionService(store,bridge,{batchSize:2});job=store.get('jobs',job.id);assert.equal(job.state,'paused');
 await resumed.reconcile(job.id);job=store.get('jobs',job.id);resumed.apply(job.id,{changeHash:job.changeHash});await resumed.idle();assert.equal(store.get('jobs',job.id).state,'completed');
});

test('a captured survey cannot target a replacement world with the same name',async()=>{
 const {service,store,bridge}=setup();const site=store.create('sites',{world:'builder-isolated',worldId:'previous-world'});
 const draft=store.create('drafts',{valid:true,siteId:site.id,candidate:{hash:'artifact'}});store.create('revisions',{artifactHash:'artifact'});
 bridge.read=async()=>{throw Error('Must reject before reading');};
 try{await assert.rejects(service.prepare(draft.id,{artifactHash:'artifact',idempotencyKey:'new-world'}),/world identity/);}finally{fs.rmSync(store.root,{recursive:true,force:true});}
});
