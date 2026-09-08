const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {importSite,rotateState,transformCells,assessSite}=require('./sites.cjs');
const {FileStore}=require('./workspace-store.cjs');
const {DesignService}=require('./design-service.cjs');
const {exportSchematic}=require('./schematic.cjs');
const {createHash}=require('node:crypto');
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
function artifact(){const a={schema_version:1,plan_id:'fixture',revision:'r0',name:'Fixture',description:'Test',dimensions:{x:4,y:4,z:4},components:[{id:'wall'}],spaces:[],blocks:[{x:0,y:0,z:0,block:'minecraft:stone',component:'wall'}]};return {...a,hash:hash(a)};}
const metadata={name:'Test site',world:'isolated-test',origin:[100,60,200],capturedAt:'2026-09-06T00:00:00Z',plot:{min:[100,60,200],max:[104,64,204]},frontage:[101,61,200],protected:[]};
test('bounded import preserves origin, known air, and rejects truncated or oversized input',()=>{
 const site=importSite(exportSchematic(artifact()),metadata);
 assert.deepEqual(site.origin,metadata.origin);assert.equal(site.blocks.length,1);assert.equal(site.complete,true);
 assert.throws(()=>importSite(Buffer.from('bad'),metadata));
 assert.throws(()=>importSite(Buffer.alloc(8*1024*1024+1),metadata),/limit/);
 assert.throws(()=>importSite(exportSchematic(artifact()),{...metadata,plot:{min:[0,0,0],max:[2,2,2]}}),/plot/i);
});
test('quarter turns rotate coordinates and directional properties together',()=>{
 assert.equal(rotateState('minecraft:oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',1),'minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]');
 assert.equal(rotateState('minecraft:oak_log[axis=x]',1),'minecraft:oak_log[axis=z]');
 assert.equal(rotateState('minecraft:oak_sign[rotation=15,waterlogged=false]',1),'minecraft:oak_sign[rotation=3,waterlogged=false]');
 assert.equal(rotateState('minecraft:rail[shape=ascending_north,waterlogged=false]',1),'minecraft:rail[shape=ascending_east,waterlogged=false]');
 const a=artifact();a.blocks[0].x=1;a.blocks[0].z=2;
 assert.deepEqual(transformCells(a,{origin:[10,20,30],turns:1})[0],{...a.blocks[0],x:11,y:20,z:31});
 assert.throws(()=>transformCells(a,{origin:[0,0,0],turns:1.5}));
});
test('site assessment distinguishes excavation, occupied cells, exclusions, and unknown context',()=>{
 const site=importSite(exportSchematic(artifact()),metadata),a=artifact();
 a.blocks[0].block='minecraft:air';
 const t={origin:metadata.origin,turns:0};
 assert.equal(assessSite(site,a,t).excavations.length,1);
 site.protected=[{min:[100,60,200],max:[101,61,201]}];
 assert.equal(assessSite(site,a,t).valid,false);
 assert.equal(assessSite(site,a,{origin:[0,0,0],turns:0}).valid,false);
});
test('file storage preserves immutable records and survives a new process instance',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-store-')),store=new FileStore(root);
 const a=store.create('sites',{name:'one'});assert.equal(new FileStore(root).get('sites',a.id).name,'one');
 assert.throws(()=>store.get('sites','../secret'));
 const b=store.update('sites',a.id,1,{name:'two'});assert.equal(b.version,2);
 assert.throws(()=>store.update('sites',a.id,1,{name:'stale'}),/conflict/i);
 store.putArtifact(artifact());assert.equal(store.getArtifact(artifact().hash).hash,artifact().hash);
});
test('draft undo redo and save retain immutable baseline and reject stale updates',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-design-')),store=new FileStore(root);
 const compile=async plan=>{const a=artifact();a.revision=plan.revision;a.blocks[0].block=plan.palette.wall;delete a.hash;return {...a,hash:hash(a)};};
 const service=new DesignService(store,{compile});
 const plan={schema_version:1,plan_id:'fixture',revision:'r0',palette:{wall:'minecraft:stone'},components:[],spaces:[]};
 let d=await service.createDraft({plan});const baseline=d.candidate.hash;
 d=await service.editDraft(d.id,{expectedVersion:d.version,palette:{wall:'minecraft:quartz_block'}});
 assert.notEqual(d.candidate.hash,baseline);
 await assert.rejects(()=>service.editDraft(d.id,{expectedVersion:1,palette:{wall:'minecraft:dirt'}}),/conflict/i);
 d=await service.history(d.id,{expectedVersion:d.version,direction:'undo'});assert.equal(d.candidate.hash,baseline);
 d=await service.history(d.id,{expectedVersion:d.version,direction:'redo'});
 const saved=service.save(d.id,{expectedVersion:d.version,candidateHash:d.candidate.hash,idempotencyKey:'save-test'});
 assert.equal(new FileStore(root).get('revisions',saved.id).artifactHash,d.candidate.hash);
 assert.equal(service.save(d.id,{expectedVersion:d.version,candidateHash:d.candidate.hash,idempotencyKey:'save-test'}).id,saved.id);
});
test('failed compilation retains last valid candidate and never saves invalid draft',async()=>{
 const store=new FileStore(fs.mkdtempSync(path.join(os.tmpdir(),'builder-failed-')));
 const service=new DesignService(store,{compile:async plan=>{if(plan.palette.bad)throw Error('invalid geometry');return artifact();}});
 let d=await service.createDraft({plan:{plan_id:'fixture',revision:'r0',palette:{},components:[]}});
 const baseline=d.candidate.hash;
 d=await service.editDraft(d.id,{expectedVersion:d.version,palette:{bad:'minecraft:stone'}});
 assert.equal(d.valid,false);assert.equal(d.candidate.hash,baseline);
 assert.throws(()=>service.save(d.id,{expectedVersion:d.version,candidateHash:baseline,idempotencyKey:'invalid'}),/invalid/i);
});
test('storage exhaustion preserves the last durable record',()=>{
 const store=new FileStore(fs.mkdtempSync(path.join(os.tmpdir(),'builder-quota-')),{maxBytes:400});
 const record=store.create('briefs',{text:'original'});
 assert.throws(()=>store.update('briefs',record.id,record.version,{text:'x'.repeat(500)}),/quota/);
 assert.equal(store.get('briefs',record.id).text,'original');
});
