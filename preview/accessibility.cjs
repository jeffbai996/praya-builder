const {transformCells,air}=require('./sites.cjs');

const offsets=[[1,0],[-1,0],[0,1],[0,-1]];
const key=(x,y,z)=>`${x},${y},${z}`;
const pointKey=p=>key(p[0],p[1],p[2]);
const base=state=>state.split('[')[0];
const door=state=>base(state).endsWith('_door');
const carpet=state=>base(state).endsWith('_carpet');
const pane=state=>base(state).endsWith('_pane')||base(state)==='minecraft:iron_bars';
const lantern=state=>base(state).endsWith('lantern');
const freeState=state=>air(state)||door(state)||carpet(state);
const supportState=state=>!!state&&!air(state)&&!door(state)&&!pane(state)&&!carpet(state)&&!lantern(state);

function inversePoint(local,site,artifact,transform){
 const world=[local[0]+site.origin[0],local[1]+site.origin[1],local[2]+site.origin[2]];
 const rx=world[0]-transform.origin[0],ry=world[1]-transform.origin[1],rz=world[2]-transform.origin[2];
 const w=artifact.dimensions.x,d=artifact.dimensions.z;
 if(transform.turns===0)return [rx,ry,rz];
 if(transform.turns===1)return [rz,ry,d-1-rx];
 if(transform.turns===2)return [w-1-rx,ry,d-1-rz];
 return [w-1-rz,ry,rx];
}

class MinHeap{
 constructor(){this.items=[];}
 push(value){const a=this.items;a.push(value);let i=a.length-1;while(i){const p=(i-1)>>1;if(compare(a[p],value)<=0)break;a[i]=a[p];i=p;}a[i]=value;}
 pop(){const a=this.items;if(!a.length)return null;const first=a[0],last=a.pop();if(a.length){let i=0;while(true){let c=i*2+1;if(c>=a.length)break;if(c+1<a.length&&compare(a[c+1],a[c])<0)c++;if(compare(a[c],last)>=0)break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
const compare=(a,b)=>a.foot-b.foot||a.head-b.head||a.steps-b.steps||a.order-b.order;

function analyzeAccess(site,artifact,transform){
 if(!site)return {checked:false,doors:[],reached:new Set(),reachedPoints:[],headroom:[],routeHints:new Map()};
 const map=new Map(site.blocks.map(c=>[key(c.x,c.y,c.z),{block:c.block,component:'context'}]));
 const cells=transformCells(artifact,transform).map((c,index)=>({
  ...c,index,plan:[artifact.blocks[index].x,artifact.blocks[index].y,artifact.blocks[index].z],
  x:c.x-site.origin[0],y:c.y-site.origin[1],z:c.z-site.origin[2]
 }));
 const owned=new Map();
 for(const c of cells){map.set(key(c.x,c.y,c.z),c);owned.set(key(c.x,c.y,c.z),c);}
 const state=(x,y,z)=>map.get(key(x,y,z))?.block||'minecraft:air';
 const free=(x,y,z)=>freeState(state(x,y,z));
 const support=(x,y,z)=>supportState(map.get(key(x,y,z))?.block);
 const inside=(x,y,z)=>x>=0&&x<site.dimensions.x&&z>=0&&z<site.dimensions.z&&y>0&&y+1<site.dimensions.y;
 const walk=(x,y,z)=>inside(x,y,z)&&free(x,y,z)&&free(x,y+1,z)&&support(x,y-1,z);
 const lowWalk=(x,y,z)=>inside(x,y,z)&&free(x,y,z)&&support(x,y-1,z);
 const start=site.frontage.map((v,i)=>v-site.origin[i]),queue=[],seen=new Set();
 if(walk(...start)){queue.push(start);seen.add(pointKey(start));}
 for(let cursor=0;cursor<queue.length;cursor++){
  const [x,y,z]=queue[cursor];
  for(const [dx,dz]of offsets)for(const dy of [0,1,-1]){
   const next=[x+dx,y+dy,z+dz],k=pointKey(next);
   if(!seen.has(k)&&walk(...next)&&(dy<=0||free(x,y+2,z))){seen.add(k);queue.push(next);break;}
  }
 }

 // A one-block-high traversal identifies otherwise reachable cells with bad headroom.
 const lowQueue=[],lowSeen=new Set(),lowPrevious=new Map(),headroom=[];
 if(lowWalk(...start)){lowQueue.push(start);lowSeen.add(pointKey(start));}
 for(let cursor=0;cursor<lowQueue.length;cursor++){
  const [x,y,z]=lowQueue[cursor];
  if(!free(x,y+1,z)){
   const blocked=map.get(key(x,y+1,z));
   headroom.push({at:inversePoint([x,y,z],site,artifact,transform),blockedAt:inversePoint([x,y+1,z],site,artifact,transform),block:blocked?.block||state(x,y+1,z),component:blocked?.component||null});
  }
  for(const [dx,dz]of offsets)for(const dy of [0,1,-1]){
   const next=[x+dx,y+dy,z+dz],k=pointKey(next);
   if(!lowSeen.has(k)&&lowWalk(...next)){lowSeen.add(k);lowPrevious.set(k,key(x,y,z));lowQueue.push(next);break;}
  }
 }

 const doors=cells.filter(c=>door(c.block)&&/half=lower/.test(c.block));
 const unreachable=doors.filter(c=>!seen.has(key(c.x,c.y,c.z)));
 const routeHints=new Map();
 if(unreachable.length&&seen.size){
  // Find the cheapest route through obstructions from every actually reached
  // cell. Cutting through a foot-level wall costs more than clearing headroom;
  // path length only breaks equal obstruction costs.
  const heap=new MinHeap(),best=new Map(),source=new Map(),firstBlocker=new Map();let order=0;
  for(const p of queue){const k=pointKey(p);best.set(k,[0,0,0]);source.set(k,p);heap.push({point:p,foot:0,head:0,steps:0,order:order++});}
  while(heap.items.length){
   const item=heap.pop(),[x,y,z]=item.point,k=pointKey(item.point),known=best.get(k);
   if(!known||known[0]!==item.foot||known[1]!==item.head||known[2]!==item.steps)continue;
   for(const [dx,dz]of offsets)for(const dy of [0,1,-1]){
    const next=[x+dx,y+dy,z+dz];if(!inside(...next)||!support(next[0],next[1]-1,next[2]))continue;
    const footBlocker=!free(...next)?next:null,headBlockers=[[next[0],next[1]+1,next[2]],...(dy>0?[[x,y+2,z]]:[])].filter(p=>!free(...p));
    const foot=item.foot+(footBlocker?1:0),head=item.head+(headBlockers.length?1:0),steps=item.steps+1,nk=pointKey(next),prior=best.get(nk),score=[foot,head,steps];
    if(prior&&(prior[0]<foot||(prior[0]===foot&&(prior[1]<head||(prior[1]===head&&prior[2]<=steps)))))continue;
    best.set(nk,score);source.set(nk,source.get(k));firstBlocker.set(nk,firstBlocker.get(k)||footBlocker||headBlockers[0]||null);
    heap.push({point:next,foot,head,steps,order:order++});
   }
  }
  for(const doorCell of unreachable){
   const doorKey=key(doorCell.x,doorCell.y,doorCell.z),near=source.get(doorKey),blocked=firstBlocker.get(doorKey);
   let causalBlocker=null,causalNear=null;
   // If a supported one-block-high route reaches the door, reconstruct that
   // route and report its first headroom obstruction. This stays causal to the
   // target door and beats a shorter route that merely cuts through a wall.
   if(lowSeen.has(doorKey)){
    const route=[];let cursor=doorKey;
    while(cursor){route.push(cursor.split(',').map(Number));cursor=lowPrevious.get(cursor);}
    route.reverse();
    for(const p of route){
     if(seen.has(pointKey(p)))causalNear=p;
     if(!free(p[0],p[1]+1,p[2])){const at=[p[0],p[1]+1,p[2]],cell=map.get(pointKey(at));causalBlocker={at:inversePoint(at,site,artifact,transform),block:cell?.block||state(...at),component:cell?.component||null};break;}
    }
   }
   if(!near&&!causalNear){routeHints.set(doorKey,{nearestReached:null,blocker:null});continue;}
   const blockerCell=blocked?map.get(pointKey(blocked)):null;
   routeHints.set(doorKey,{nearestReached:inversePoint(causalNear||near,site,artifact,transform),blocker:causalBlocker||(blocked?{at:inversePoint(blocked,site,artifact,transform),block:blockerCell?.block||state(...blocked),component:blockerCell?.component||null}:null)});
  }
 }
 return {checked:true,map,owned,cells,doors,reached:seen,reachedPoints:queue.map(p=>inversePoint(p,site,artifact,transform)),headroom,routeHints,start:inversePoint(start,site,artifact,transform)};
}

// Conservative one-block walking grid. Doors are treated as openable, not as solid walls.
function checkAccess(site,artifact,transform){
 if(!site)return {model:'voxel-walk-v2',checked:false,issues:[]};
 const analysis=analyzeAccess(site,artifact,transform);
 const issues=analysis.doors.filter(c=>!analysis.reached.has(key(c.x,c.y,c.z))).map(c=>{
  const route=analysis.routeHints.get(key(c.x,c.y,c.z))||{};
  return {reason:'Entrance has no supported two-block-high route from the street',component:c.component,at:c.plan,nearestReached:route.nearestReached||null,blocker:route.blocker||null};
 });
 if(!analysis.reached.size)issues.unshift({reason:'Street connection is not a supported walking position',at:analysis.start,nearestReached:null,blocker:null});
 const result={model:'voxel-walk-v2',checked:true,openableDoors:analysis.doors.length,reachedCells:analysis.reached.size,issues,limitations:'Full-block support approximation; doors assumed openable. Player physics and resource-pack appearance require in-game inspection.'};
 Object.defineProperty(result,'_analysis',{value:analysis,enumerable:false});
 return result;
}

module.exports={checkAccess,analyzeAccess,freeState,supportState,inversePoint};
