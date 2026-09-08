const {transformCells,air}=require('./sites.cjs');
// Conservative one-block walking grid. Doors are treated as openable, not as solid walls.
function checkAccess(site,artifact,transform){
 if(!site)return {model:'voxel-walk-v1',checked:false,issues:[]};
 const key=(x,y,z)=>`${x},${y},${z}`,map=new Map(site.blocks.map(c=>[key(c.x,c.y,c.z),c.block]));
 const cells=transformCells(artifact,transform).map(c=>({...c,x:c.x-site.origin[0],y:c.y-site.origin[1],z:c.z-site.origin[2]}));
 for(const c of cells)map.set(key(c.x,c.y,c.z),c.block);
 const free=(x,y,z)=>{const state=map.get(key(x,y,z))||'minecraft:air';return air(state)||/minecraft:[a-z_]+_door\[/.test(state)||state.includes('_carpet');};
 const support=(x,y,z)=>{const state=map.get(key(x,y,z));return state&&!air(state)&&!state.includes('_door[')&&!state.includes('_pane[')&&!state.includes('_carpet')&&!state.includes('lantern');};
 const walk=(x,y,z)=>x>=0&&x<site.dimensions.x&&z>=0&&z<site.dimensions.z&&y>0&&y+1<site.dimensions.y&&free(x,y,z)&&free(x,y+1,z)&&support(x,y-1,z);
 const start=site.frontage.map((v,i)=>v-site.origin[i]),queue=[],seen=new Set();
 if(walk(...start)){queue.push(start);seen.add(key(...start));}
 for(let cursor=0;cursor<queue.length;cursor++){
  const [x,y,z]=queue[cursor];
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])for(const dy of [0,1,-1]){
   const next=[x+dx,y+dy,z+dz],k=key(...next);if(!seen.has(k)&&walk(...next)&&(dy<=0||free(x,y+2,z))){seen.add(k);queue.push(next);break;}
  }
 }
 const doors=cells.filter(c=>c.block.includes('_door[')&&c.block.includes('half=lower'));
 const issues=doors.filter(c=>!seen.has(key(c.x,c.y,c.z))).map(c=>({reason:'Entrance has no supported two-block-high route from the street',component:c.component,at:[c.x,c.y,c.z]}));
 if(!queue.length)issues.unshift({reason:'Street connection is not a supported walking position',at:start});
 return {model:'voxel-walk-v1',checked:true,openableDoors:doors.length,reachedCells:seen.size,issues,limitations:'Full-block support approximation; doors assumed openable. Player physics and resource-pack appearance require in-game inspection.'};
}
module.exports={checkAccess};
