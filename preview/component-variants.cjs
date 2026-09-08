function applyVariant(plan,baseline,componentId,variant){
 if(!/^study-(bar|staggered|court)$/.test(plan.plan_id)||!/^wing-[01]-roof$/.test(componentId)||variant.name!=='roof-canopy'||!['open','sheltered'].includes(variant.value))throw Error('Unsupported component variant');
 const part=plan.components.find(c=>c.id===componentId),original=baseline.components.find(c=>c.id===componentId);if(!part||!original)throw Error('Roof assembly is unavailable');
 const roof=original.operations[0].min[1];
 const canopy=op=>op.op==='box'&&((op.material==='wood'&&op.min[1]===roof+1)||(op.material==='slab'&&op.min[1]===roof+4));
 const originalCanopy=original.operations.filter(canopy);if(originalCanopy.length!==3)throw Error('Roof assembly has changed; submit a structured revision');
 part.operations=part.operations.filter(op=>!canopy(op));
 if(variant.value==='sheltered')part.operations.push(...JSON.parse(JSON.stringify(originalCanopy)));
 return plan;
}
module.exports={applyVariant};
