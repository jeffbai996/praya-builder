// Local collision-style boxes for the road section's slabs and stairs.
// Other context blocks retain the existing occupancy-cube representation.
export function blockBoxes(state){
 const name=String(state).split('[')[0],props=Object.fromEntries((String(state).split('[')[1]||'').replace(']','').split(',').filter(Boolean).map(s=>s.split('=')));
 if(name.endsWith('_slab')&&props.type!=='double')return [[0,props.type==='top'?.5:0,0,1,props.type==='top'?1:.5,1]];
 if(!name.endsWith('_stairs'))return [[0,0,0,1,1,1]];
 const top=props.half==='top',boxes=[[0,top?.5:0,0,1,top?1:.5,1]],angle={east:0,south:1,west:2,north:3}[props.facing]??0;
 const rotate=(x,z)=>{for(let i=0;i<angle;i++){[x,z]=[1-z,x];}return [x,z];};
 for(let x=0;x<2;x++)for(let z=0;z<2;z++){
  let step=x===1;
  if(props.shape==='outer_left')step=step&&z===0;
  if(props.shape==='outer_right')step=step&&z===1;
  if(props.shape==='inner_left')step=step||z===0;
  if(props.shape==='inner_right')step=step||z===1;
  if(!step)continue;const a=rotate(x/2,z/2),b=rotate((x+1)/2,(z+1)/2);
  boxes.push([Math.min(a[0],b[0]),top?0:.5,Math.min(a[1],b[1]),Math.max(a[0],b[0]),top?.5:1,Math.max(a[1],b[1])]);
 }
 return boxes;
}
