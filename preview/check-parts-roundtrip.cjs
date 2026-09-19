// Real Java compilation, isolated records, no world bridge or placement calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {FileStore}=require('./workspace-store.cjs'),{DesignService}=require('./design-service.cjs');
async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-parts-edit-')),store=new FileStore(root),service=new DesignService(store);
 try{
  const plan={schema_version:1,plan_id:'parts-edit-fixture',revision:'r1',name:'Parts fixture',dimensions:{x:24,y:16,z:24},palette:{wall:'minecraft:stone',seat:'minecraft:oak_stairs[facing=north]',table:'minecraft:oak_slab[type=top]'},components:[{id:'baseline',role:'foundation',origin:[0,0,0],operations:[{op:'block',at:[0,0,0],material:'wall'}]}]};
  let draft=await service.createDraft({plan,author:{agent:'fixture',model:'test'}});
  const original=structuredClone(draft.candidate.blocks[0]);
  draft=await service.editDraft(draft.id,{expectedVersion:draft.version,part:{id:'seat.pair',at:[3,1,3],params:{}}});assert(draft.valid,JSON.stringify(draft.diagnostics));assert.equal(draft.plan.schema_version,2);
  draft=await service.editDraft(draft.id,{expectedVersion:draft.version,part:{id:'seat.pair',at:[12,1,3],params:{facing:'east'}}});assert(draft.valid,JSON.stringify(draft.diagnostics));
  const chosen=draft.plan.components[1].id,other=draft.plan.components[2].id,untouched=draft.candidate.blocks.filter(b=>b.component===other);
  draft=await service.editDraft(draft.id,{expectedVersion:draft.version,componentId:chosen,palette:{seat:'minecraft:birch_stairs[facing=north]'}});assert(draft.valid,JSON.stringify(draft.diagnostics));
  assert.deepEqual(draft.candidate.blocks.find(b=>b.component==='baseline'),original);assert.deepEqual(draft.candidate.blocks.filter(b=>b.component===other),untouched);assert(draft.candidate.blocks.some(b=>b.component===chosen&&b.block.startsWith('minecraft:birch_stairs')));
  const baseline=draft.candidate.hash;
  draft=await service.editDraft(draft.id,{expectedVersion:draft.version,part:{id:'seat.pair',at:[3,1,3],params:{}}});assert.equal(draft.valid,false);assert.equal(draft.candidate.hash,baseline);assert(draft.diagnostics.some(d=>d.rule==='compile.invalid-plan'));
  draft=await service.history(draft.id,{expectedVersion:draft.version,direction:'undo'});assert(draft.valid);assert.equal(draft.candidate.hash,baseline);
  console.log('PARTS_ROUNDTRIP_PASS insertion=2 scoped-material=1 unrelated-preserved=1 overlap-retained=1 undo=1');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
