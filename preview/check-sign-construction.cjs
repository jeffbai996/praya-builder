const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {FileStore}=require('./workspace-store.cjs'),{ConstructionService}=require('./construction-service.cjs');
const sign=text=>({front:{lines:['',text,'CENTERED',''].map(text=>JSON.stringify({text})),color:'white',glowing:true},back:{lines:['','BACK','',''].map(text=>JSON.stringify({text})),color:'black',glowing:false},waxed:true});
const block='minecraft:oak_wall_sign[facing=north,waterlogged=false]';
function setup(){const store=new FileStore(fs.mkdtempSync(path.join(os.tmpdir(),'sign-jobs-'))),world=new Map();const bridge={read:async cells=>cells.map(c=>world.get(c.x)||'minecraft:air'),batch:async cells=>{let applied=0;for(const c of cells){const now=world.get(c.x)||'minecraft:air',expected=c.beforeSign?{block:c.before,sign:c.beforeSign}:c.before;if(JSON.stringify(now)!==JSON.stringify(expected))break;world.set(c.x,c.sign?{block:c.block,sign:c.sign}:c.block);applied++;}return {applied};}};return {store,world,bridge,service:new ConstructionService(store,bridge)};}
async function job(s,change,key='test'){return s.service.prepareChanges({changes:[change],artifactHash:'a',surveyHash:'b',worldId:'test',world:'builder-isolated',idempotencyKey:key});}
async function apply(s,j){s.service.apply(j.id,{changeHash:j.changeHash});await s.service.idle();return s.store.get('jobs',j.id);}
test('new sign verifies both faces and metadata and undoes to air',async()=>{const s=setup(),j=await job(s,{x:1,y:100,z:1,before:'minecraft:air',block,sign:sign('NEW')});assert.equal((await apply(s,j)).state,'completed');assert.deepEqual(s.world.get(1).sign,sign('NEW'));const undo=await s.service.rollback(j.id);assert.equal((await apply(s,undo)).state,'completed');assert.equal(s.world.get(1),'minecraft:air');});
test('text-only revision restores previous text, back side, glow, color and wax',async()=>{const s=setup(),old=sign('OLD');old.waxed=false;s.world.set(1,{block,sign:old});const j=await job(s,{x:1,y:100,z:1,before:block,beforeSign:old,block,sign:sign('NEW')});assert.equal((await apply(s,j)).state,'completed');assert.equal((await apply(s,await s.service.rollback(j.id))).state,'completed');assert.deepEqual(s.world.get(1),{block,sign:old});});
test('later text edit is preserved by undo',async()=>{const s=setup(),j=await job(s,{x:1,y:100,z:1,before:'minecraft:air',block,sign:sign('NEW')});await apply(s,j);s.world.set(1,{block,sign:sign('SOMEONE ELSE')});const undo=await s.service.rollback(j.id);assert.equal(undo.changes.length,0);assert.equal(undo.conflicts.length,1);});
test('stale sign text stops before writing even with unchanged block state',async()=>{const s=setup();s.world.set(1,{block,sign:sign('OTHER')});const j=await job(s,{x:1,y:100,z:1,before:block,beforeSign:sign('OLD'),block,sign:sign('NEW')});assert.equal((await apply(s,j)).state,'conflict');});
test('bridge losing sign text fails readback',async()=>{const s=setup();s.bridge.batch=async cells=>{s.world.set(1,block);return {applied:1};};const j=await job(s,{x:1,y:100,z:1,before:'minecraft:air',block,sign:sign('NEW')});assert.equal((await apply(s,j)).state,'paused');});

test('draft preparation rotates authored sign text and rejects protected text-only writes',async()=>{
 const {fixture}=require('./site-fixtures.cjs');const {transformCells}=require('./sites.cjs');const s=setup();
 const site=s.store.create('sites',{...fixture('flat'),worldId:'test'});
 const candidate={hash:'signed',dimensions:{x:4,y:4,z:4},blocks:[{x:1,y:1,z:1,block,component:'sign'}],signs:[{at:[1,1,1],lines:['','CENTERED','NOTICE','']}]};
 const transform={origin:[5,60,5],turns:1};const placed=transformCells(candidate,transform)[0];
 const draft=s.store.create('drafts',{valid:true,siteId:site.id,candidate,transform});s.store.create('revisions',{artifactHash:candidate.hash});
 s.bridge.status=async()=>({connected:true,world:site.world,worldId:'test',capabilities:{signData:1}});
 s.bridge.read=async cells=>cells.map(()=> 'minecraft:air');
 const prepared=await s.service.prepare(draft.id,{artifactHash:'signed',idempotencyKey:'prepare'});
 assert.equal(prepared.changes[0].x,placed.x);assert.equal(prepared.changes[0].block,placed.block);assert.equal(JSON.parse(prepared.changes[0].sign.front.lines[1]).text,'CENTERED');
 const sameSite=s.store.get('sites',site.id);sameSite.blocks.push({x:placed.x,y:placed.y-60,z:placed.z,block:placed.block});sameSite.protected.push({min:[placed.x,placed.y,placed.z],max:[placed.x+1,placed.y+1,placed.z+1]});s.store.update('sites',site.id,sameSite.version,sameSite);
 await assert.rejects(()=>s.service.prepare(draft.id,{artifactHash:'signed',idempotencyKey:'protected'}),/protected area/);
});
