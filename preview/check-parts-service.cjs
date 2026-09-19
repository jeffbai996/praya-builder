const {test}=require('node:test'),assert=require('node:assert/strict');
const {insertPart,rewriteMaterial}=require('./parts-service.cjs');
const parts=[{id:'fixture.part',parameters:{shell:{type:'material',default:'wall'},width:{type:'integer',min:1,max:4,default:2},facing:{type:'enum',values:['north','south'],default:'north'}}}];
const plan=()=>({schema_version:1,dimensions:{x:8,y:8,z:8},palette:{wall:'minecraft:stone',air:'minecraft:air'},components:[{id:'existing',origin:[0,0,0],operations:[{op:'block',at:[0,0,0],material:'wall'}]}]});
test('part insertion preserves existing components and validates typed, caller-owned palette parameters',()=>{
 const draft=plan(),before=structuredClone(draft.components[0]);insertPart(draft,{id:'fixture.part',at:[2,1,2],params:{}},parts);
 assert.equal(draft.schema_version,2);assert.deepEqual(draft.components[0],before);assert.equal(draft.components[1].operations[0].params.shell,'wall');
 insertPart(draft,{id:'fixture.part',at:[5,1,2]},parts);assert.notEqual(draft.components[1].id,draft.components[2].id);
 for(const input of [{id:'missing',at:[0,0,0]},{id:'fixture.part',at:[-1,0,0]},{id:'fixture.part',at:[0,0,0],params:{width:9}},{id:'fixture.part',at:[0,0,0],params:{shell:'not-in-palette'}},{id:'fixture.part',at:[0,0,0],params:{facing:'east'}}])assert.throws(()=>insertPart(plan(),input,parts));
});
test('scoped material edits follow fill interiors and implicit call material defaults without changing enum params',()=>{
 const operations=[{op:'fill',material:'air',interior:'wall'},{op:'repeat',operations:[{op:'call',part:'fixture.part',params:{facing:'north'}}]}];
 rewriteMaterial(operations,parts,'wall','selected-only');
 assert.equal(operations[0].interior,'selected-only');assert.equal(operations[1].operations[0].params.shell,'selected-only');assert.equal(operations[1].operations[0].params.facing,'north');assert.equal(operations[0].material,'air');
});
