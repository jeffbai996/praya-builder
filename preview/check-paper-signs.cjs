// Runs only against this task's disposable loopback Paper instance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PaperBridge,ConstructionService}=require('./construction-service.cjs'),{FileStore}=require('./workspace-store.cjs');
const runtime=path.join(__dirname,'.workspace/sign-bridge-test');
const bridge=new PaperBridge({url:'http://127.0.0.1:8097',token:JSON.parse(fs.readFileSync(path.join(runtime,'runtime.json'))).bridgeToken});
const sign=text=>({front:{lines:['',text,'聯邦大道',''].map(text=>JSON.stringify({text})),color:'white',glowing:true},back:{lines:['','BACK','SERVICE',''].map(text=>JSON.stringify({text})),color:'black',glowing:false},waxed:true});
(async()=>{
 const status=await bridge.status();assert.equal(status.world,'builder-isolated');assert.equal(status.capabilities.signData,1);
 const store=new FileStore(path.join(runtime,'proof-'+Date.now())),service=new ConstructionService(store,bridge);
 const cell={x:1,y:100,z:1},support={x:1,y:100,z:2},block='minecraft:oak_wall_sign[facing=north,waterlogged=false]';
 assert.deepEqual(await bridge.read([cell,support],status.worldId),['minecraft:air','minecraft:air']);
 assert.equal((await bridge.batch([{...support,before:'minecraft:air',block:'minecraft:stone'}],status.worldId)).applied,1);
 async function run(change,key){const j=await service.prepareChanges({changes:[change],worldId:status.worldId,world:status.world,artifactHash:'sign-test',surveyHash:'empty',idempotencyKey:key});service.apply(j.id,{changeHash:j.changeHash});await service.idle();const result=store.get('jobs',j.id);assert.equal(result.state,'completed',JSON.stringify(result));return result;}
 const first=await run({...cell,before:'minecraft:air',block,sign:sign('FIRST')},'create');
 const one=(await bridge.read([cell],status.worldId))[0];assert.ok(one.sign.front.glowing);assert.equal(one.sign.front.color,'white');assert.equal(one.sign.waxed,true);
 const second=await run({...cell,before:block,beforeSign:one.sign,block,sign:sign('SECOND')},'text-only');
 const undo=await service.rollback(second.id);service.apply(undo.id,{changeHash:undo.changeHash});await service.idle();assert.equal(store.get('jobs',undo.id).state,'completed');assert.deepEqual((await bridge.read([cell],status.worldId))[0],one);
 const altered=sign('PLAYER EDIT');await bridge.batch([{...cell,before:block,beforeSign:one.sign,block,sign:altered}],status.worldId);
 const conflict=await service.rollback(first.id);assert.equal(conflict.changes.length,0);assert.equal(conflict.conflicts.length,1);
 const current=(await bridge.read([cell],status.worldId))[0];assert.equal((await bridge.batch([{...cell,before:block,beforeSign:one.sign,block,sign:sign('STALE')}],status.worldId)).applied,0);
 await bridge.batch([{...cell,before:block,beforeSign:current.sign,block:'minecraft:air'}],status.worldId);
 await bridge.batch([{...support,before:'minecraft:stone',block:'minecraft:air'}],status.worldId);
 assert.deepEqual(await bridge.read([cell,support],status.worldId),['minecraft:air','minecraft:air']);
 console.log('PAPER_SIGN_PASS: placement, two-sided Unicode/color/glow/wax readback, text-only edit, exact undo, later-edit preservation, stale-text CAS and clean restoration');
})().catch(e=>{console.error(e);process.exitCode=1});
