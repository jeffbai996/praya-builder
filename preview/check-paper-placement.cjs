// Explicitly opt-in: this probe writes only through the reserved isolated bridge.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {FileStore}=require('./workspace-store.cjs');const {DesignService}=require('./design-service.cjs');const {PaperBridge,ConstructionService}=require('./construction-service.cjs');const {fixture}=require('./site-fixtures.cjs');const {apartmentStudy}=require('./apartment-studies.cjs');const {stateBlock}=require('./mesh.cjs');
const equal=(a,b)=>stateBlock(a).stateId===stateBlock(b).stateId;
async function main(){
 if(process.env.BUILDER_ISOLATED_WRITE_TEST!=='1')throw Error('Set BUILDER_ISOLATED_WRITE_TEST=1 only for the reserved disposable world');
 const runtime=JSON.parse(fs.readFileSync(path.join(process.env.BUILDER_RUNTIME,'runtime.json'),'utf8'));
 process.env.BUILDER_BRIDGE_URL='http://127.0.0.1:8094';process.env.BUILDER_BRIDGE_TOKEN=runtime.bridgeToken;
 const bridge=new PaperBridge(),status=await bridge.status();assert.equal(status.world,'builder-isolated');
 const unauthorized=await fetch('http://127.0.0.1:8094/status');assert.equal(unauthorized.status,401);
 await assert.rejects(()=>bridge.read([{x:-1,y:60,z:0}],status.worldId),/reserved plot/);
 await assert.rejects(()=>bridge.batch([{x:0,y:60,z:0,before:'minecraft:air',block:'minecraft:tnt'}],status.worldId),/allowlist/);
 const survey=fixture('slope'),terrain=survey.blocks.map(c=>({...c,x:c.x+survey.origin[0],y:c.y+survey.origin[1],z:c.z+survey.origin[2]}));
 // Fixture setup is separate from reviewed construction. Refuse unexpected occupied test terrain.
 for(let i=0;i<terrain.length;i+=128){const batch=terrain.slice(i,i+128),states=await bridge.read(batch,status.worldId),changes=[];batch.forEach((c,j)=>{if(!equal(states[j],c.block)){assert.ok(states[j]==='minecraft:air'||(states[j]==='minecraft:dirt'&&c.block.startsWith('minecraft:grass_block')),'Unexpected occupied test fixture');changes.push({...c,before:states[j]});}});while(changes.length){const result=await bridge.batch(changes,status.worldId);assert.ok(result.applied>0);changes.splice(0,result.applied);}}
 const store=new FileStore(path.join(process.env.BUILDER_RUNTIME,'placement-proof-'+Date.now())),design=new DesignService(store),service=new ConstructionService(store,bridge);
 const site=store.create('sites',survey),draft=await design.createDraft({plan:apartmentStudy('bar',3),siteId:site.id,transform:{origin:site.origin,turns:0}});
 assert.equal(draft.valid,true);design.save(draft.id,{expectedVersion:draft.version,candidateHash:draft.candidate.hash,idempotencyKey:'proof-save'});
 let job=await service.prepare(draft.id,{artifactHash:draft.candidate.hash,idempotencyKey:'proof-placement'});
 service.apply(job.id,{changeHash:job.changeHash});await service.idle();job=store.get('jobs',job.id);assert.equal(job.state,'completed',JSON.stringify(job));
 const observed=await service.read(job.changes,status.worldId);assert.ok(observed.every((state,i)=>equal(state,job.changes[i].block)));
 const changed=job.changes.find(c=>c.block==='minecraft:stone_bricks');assert.ok(changed);
 const actual=(await bridge.read([changed],status.worldId))[0];assert.equal((await bridge.batch([{...changed,before:actual,block:'minecraft:gold_block'}],status.worldId)).applied,1);
 const reverse=await service.rollback(job.id);assert.equal(reverse.conflicts.length,1);
 service.apply(reverse.id,{changeHash:reverse.changeHash});await service.idle();const rolled=store.get('jobs',reverse.id);assert.equal(rolled.state,'completed',JSON.stringify(rolled));
 assert.equal((await bridge.read([changed],status.worldId))[0],'minecraft:gold_block');
 // Restore only the deliberate test edit; the rollback itself demonstrably preserved it.
 await bridge.batch([{...changed,before:'minecraft:gold_block',block:changed.before}],status.worldId);
 const final=await service.read(job.changes,status.worldId);assert.ok(final.every((state,i)=>equal(state,job.changes[i].before)));
 const timings=job.timings.map(t=>t.serverMs).filter(Number.isFinite).sort((a,b)=>a-b);
 const report={result:'PAPER_PLACEMENT_PASS',cells:job.changes.length,batches:job.timings.length,serverBatchP95:timings[Math.floor(timings.length*.95)],serverBatchMax:timings.at(-1),rollbackCells:reverse.changes.length,preservedConflicts:reverse.conflicts.length,artifactHash:draft.candidate.hash,jobId:job.id,worldId:status.worldId};
 fs.writeFileSync(path.join(process.env.BUILDER_RUNTIME,'placement-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
