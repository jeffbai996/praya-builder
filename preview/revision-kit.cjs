// Revision authoring preserves R0 documents; Java remains the validation boundary.
function revisionKit(plan,description){
  plan.revision='r1';plan.description=description;
  function edit(id,build){
    const target=plan.components.find(c=>c.id===id);
    if(!target)throw Error(`Missing component: ${id}`);
    const box=(min,max,material)=>target.operations.push({op:'box',min,max,material});
    const block=(at,material)=>target.operations.push({op:'block',at,material});
    build(box,block);
  }
  function set(id,role,build){
    plan.components=plan.components.filter(c=>c.id!==id);
    plan.components.push({id,role,origin:[0,0,0],operations:[]});edit(id,build);
  }
  function clip(id,rectangles){
    const target=plan.components.find(c=>c.id===id);
    if(!target||target.origin.some(v=>v!==0))throw Error('Clip requires a world-origin component');
    target.operations=target.operations.flatMap(op=>{
      if(!['box','block'].includes(op.op))throw Error('Clip supports box/block primitives only');
      const lo=op.min||op.at,hi=op.max||op.at.map(v=>v+1);
      return rectangles.flatMap(([x0,z0,x1,z1])=>{
        const min=[Math.max(lo[0],x0),lo[1],Math.max(lo[2],z0)];
        const max=[Math.min(hi[0],x1),hi[1],Math.min(hi[2],z1)];
        return min.every((v,i)=>v<max[i])?[{op:'box',min,max,material:op.material}]:[];
      });
    });
    if(!target.operations.length)plan.components=plan.components.filter(c=>c!==target);
  }
  function clearance(id,min,max){plan.spaces.push({id,min,max});}
  return {plan,edit,set,clip,clearance};
}
module.exports={revisionKit};
