const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {MunicipalRegister}=require('./municipal-register.cjs');
const {compileRoad,makeFixtureSurvey}=require('./roadwork-engine.cjs');
test('places persist independently, enforce provenance/world/conflicts and retain history',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'places-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const db=new MunicipalRegister(root);
 const input={kind:'parcel',name:'Fixture lot',world:'test-only',boundary:[[0,0],[10,0],[10,10],[0,10]],source:'Synthetic test boundary'};
 const saved=db.transaction({expectedVersion:0,records:[input]}),p=saved.records[0];
 assert.equal(p.version,1);assert.equal(db.read().records.length,1);assert.throws(()=>db.transaction({expectedVersion:0,records:[input]}),/changed/);
 assert.throws(()=>db.transaction({expectedVersion:1,records:[{...input,verification:'verified',source:''}]}),/source/);
 assert.throws(()=>db.transaction({expectedVersion:1,records:[{...input,boundary:[[0,0],[10,10],[0,10],[10,0]]}]}),/intersects/);
 assert.throws(()=>db.transaction({expectedVersion:1,records:[{...input,world:'other',links:[p.id]}]}),/world/);
 assert.equal(db.read().version,1);
 const b=db.transaction({expectedVersion:1,records:[{kind:'building',name:'Existing, no design',world:'test-only',links:[p.id],status:'observed'}]}).records[0];
 assert.equal(db.detail(p.id).related[0].id,b.id);
 const a=db.transaction({expectedVersion:2,records:[{kind:'address',name:'Fixture address',world:'test-only',number:'10',street:'Synthetic street',source:'Test sign',verification:'verified',links:[b.id]}]}).records[0];
 assert.equal(db.list(new URLSearchParams('q=Synthetic')).total,1);
 db.transaction({expectedVersion:3,records:[{...a,unit:'A',source:'Corrected test sign'}]});
 const reopened=new MunicipalRegister(root);assert.equal(reopened.detail(a.id).history.length,2);assert.equal(reopened.detail(a.id).history[0].record.unit,'');
 assert.equal(fs.existsSync(path.join(root,'drafts')),false);
});
test('parcel lineage is atomic, world checked and parent history is retained',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lineage-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const db=new MunicipalRegister(root),p={kind:'parcel',name:'Test lot',world:'fixture',boundary:[[0,0],[20,0],[20,10],[0,10]],source:'Test'};
 const parent=db.transaction({expectedVersion:0,records:[p]}).records[0];
 assert.throws(()=>db.transaction({expectedVersion:1,records:[p],lineage:{type:'split',parents:[parent.id],source:'Test'}}),/Split/);assert.equal(db.read().version,1);
 const result=db.transaction({expectedVersion:1,records:[{...p,name:'Left',boundary:[[0,0],[10,0],[10,10],[0,10]]},{...p,name:'Right',boundary:[[10,0],[20,0],[20,10],[10,10]]}],lineage:{type:'split',parents:[parent.id],source:'Manual proposed split'}});
 assert.equal(db.detail(parent.id).record.status,'retired');assert.equal(result.records.length,2);assert.equal(db.detail(result.records[0].id).history.at(-1).lineage.type,'split');
});
test('compact street is exactly two slab road cells plus two sidewalks on an axis; no lights',()=>{
 const survey=makeFixtureSurvey(),a=compileRoad({survey,points:[{x:10,y:64,z:12},{x:24,y:64,z:12}],section:'compact-slab',alternative:'preserve'});
 assert.equal(a.width,4);assert.equal(a.ready,true,JSON.stringify(a.issues));const surface=a.changes.filter(c=>c.x===16&&c.y===64);assert.equal(surface.length,4);assert.equal(surface.filter(c=>c.after.startsWith('minecraft:stone_slab')).length,2);assert.equal(surface.filter(c=>c.after.startsWith('minecraft:stone_brick_slab')).length,2);assert.ok(!a.changes.some(c=>/lantern|light/.test(c.after)));
 const north=compileRoad({survey,points:[{x:20,y:64,z:8},{x:20,y:64,z:20}],section:'compact-slab',alternative:'preserve'});assert.equal(north.changes.filter(c=>c.z===14&&c.y===64).length,4);
});
test('terrain search is deterministic, ranks actual proposals and pins endpoint tie-ins',()=>{
 const survey=makeFixtureSurvey(),points=[{x:10,y:64,z:12},{x:54,y:65,z:15}];const a=compileRoad({survey,points,alternative:'terrain',section:'compact-slab'}),b=compileRoad({survey,points,alternative:'terrain',section:'compact-slab'});
 assert.equal(a.hash,b.hash);assert.deepEqual(a.points,points);assert.ok(a.search.candidates>=2);assert.ok(a.search.costs.every(c=>c.cost>=a.metrics.terrainCost));assert.deepEqual([a.samples[0].x,a.samples[0].y,a.samples[0].z],[10,64,12]);assert.deepEqual([a.samples.at(-1).x,a.samples.at(-1).y,a.samples.at(-1).z],[54,65,15]);
});

test('review import is a dry run, paginates hundreds and isolates same-name world IDs',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'places-large-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const db=new MunicipalRegister(root),records=Array.from({length:100},(_,i)=>({kind:'building',name:'Fixture '+i,world:'same-name',worldId:i%2?'a':'b'}));
 assert.equal(db.transaction({expectedVersion:0,records},{dryRun:true}).count,100);assert.equal(db.read().records.length,0);
 for(let i=0;i<6;i++)db.transaction({expectedVersion:i,records});
 const all=db.list(new URLSearchParams());assert.equal(all.items.length,24);assert.equal(all.map.length,500);assert.equal(all.mapTruncated,true);
 const filtered=db.list(new URLSearchParams({identity:JSON.stringify(['same-name','a'])}));assert.equal(filtered.total,300);assert.ok(filtered.map.every(r=>r.worldId==='a'));
});
test('slab and stair shapes preserve half-height and facing geometry',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'roadwork-shapes.js'),'utf8');const {blockBoxes}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.deepEqual(blockBoxes('minecraft:stone_slab[type=top,waterlogged=false]'),[[0,.5,0,1,1,1]]);
 const volume=boxes=>boxes.reduce((v,b)=>v+(b[3]-b[0])*(b[4]-b[1])*(b[5]-b[2]),0);
 for(const facing of ['north','east','south','west'])for(const half of ['top','bottom'])for(const [shape,v] of [['straight',.75],['inner_left',.875],['outer_right',.625]])assert.equal(volume(blockBoxes(`minecraft:stone_brick_stairs[facing=${facing},half=${half},shape=${shape},waterlogged=false]`)),v);
});
