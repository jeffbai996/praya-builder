// A successor may explicitly transfer a bounded piece of an existing component.
// Keep box primitives and all unaffected geometry; Java still rejects collisions
// with any owner that the caller has not named, and checks all final clearances.
function claimFrom(plan,recipientId,ownerIds){
  const recipient=plan.components.find(c=>c.id===recipientId);
  if(!recipient)throw Error(`Missing recipient: ${recipientId}`);
  const bounds=op=>[op.min||op.at,op.max||op.at.map(v=>v+1)];
  function subtract(op,cut){
    const [lo,hi]=bounds(op),[a,b]=bounds(cut);
    const min=lo.map((n,i)=>Math.max(n,a[i])),max=hi.map((n,i)=>Math.min(n,b[i]));
    if(min.some((n,i)=>n>=max[i]))return [op];
    const result=[],low=[...lo],high=[...hi];
    for(let axis=0;axis<3;axis++){
      if(low[axis]<min[axis]){const end=[...high];end[axis]=min[axis];result.push({op:'box',min:[...low],max:end,material:op.material});low[axis]=min[axis];}
      if(high[axis]>max[axis]){const start=[...low];start[axis]=max[axis];result.push({op:'box',min:start,max:[...high],material:op.material});high[axis]=max[axis];}
    }
    return result;
  }
  for(const id of ownerIds){
    const owner=plan.components.find(c=>c.id===id);
    if(!owner||id===recipientId)throw Error(`Invalid transfer owner: ${id}`);
    for(const component of [owner,recipient])
      if(component.origin.some(n=>n!==0)||component.operations.some(op=>!['box','block'].includes(op.op)))
        throw Error('Component transfers require world-origin box/block primitives');
    for(const cut of recipient.operations)owner.operations=owner.operations.flatMap(op=>subtract(op,cut));
  }
}
module.exports={claimFrom};
