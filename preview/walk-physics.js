// Player-sized architectural traversal. Doors are excluded by the mesh provider.
const R=.3,H=1.8,STEP=.6,EPS=.0001;
export function createWalker(boxes){
 const grid=new Map();for(const b of boxes)for(let x=Math.floor(b[0]);x<=Math.floor(b[3]);x++)for(let z=Math.floor(b[2]);z<=Math.floor(b[5]);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,new Set());grid.get(key).add(b);}
 const near=p=>{const found=new Set();for(let x=Math.floor(p[0]-R);x<=Math.floor(p[0]+R);x++)for(let z=Math.floor(p[2]-R);z<=Math.floor(p[2]+R);z++)for(const b of grid.get(x+','+z)||[])found.add(b);return found;};
 const clear=p=>![...near(p)].some(b=>p[0]+R>b[0]+EPS&&p[0]-R<b[3]-EPS&&p[1]+H>b[1]+EPS&&p[1]<b[4]-EPS&&p[2]+R>b[2]+EPS&&p[2]-R<b[5]-EPS);
 let position=[0,0,0],velocity=0;
 const grounded=()=>!clear([position[0],position[1]-.04,position[2]]);
 function reset(preferred){const candidates=boxes.flatMap(b=>[[(b[0]+b[3])/2,b[4],(b[2]+b[5])/2],[Math.max(b[0]+R,Math.min(b[3]-R,preferred[0])),b[4],Math.max(b[2]+R,Math.min(b[5]-R,preferred[2]))]]).sort((a,b)=>(a[0]-preferred[0])**2+(a[2]-preferred[2])**2+4*(a[1]-preferred[1])**2-((b[0]-preferred[0])**2+(b[2]-preferred[2])**2+4*(b[1]-preferred[1])**2));const found=candidates.find(clear);if(!found)return null;position=[...found];velocity=0;return [...position];}
 function move(dx,dz){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));for(let i=0;i<n;i++)for(const [axis,amount] of [[0,dx/n],[2,dz/n]]){if(!amount)continue;const next=[...position];next[axis]+=amount;if(clear(next)){position=next;continue;}if(!grounded())continue;const raised=[position[0],position[1]+STEP,position[2]],step=[next[0],next[1]+STEP,next[2]];if(!clear(raised)||!clear(step))continue;let support=position[1];for(const b of near(step))if(step[0]+R>b[0]+EPS&&step[0]-R<b[3]-EPS&&step[2]+R>b[2]+EPS&&step[2]-R<b[5]-EPS&&b[4]<=step[1]+EPS&&b[4]>support)support=b[4];step[1]=support;if(clear(step))position=step;}}
 function tick(dt,dx,dz,jump=false){dt=Math.min(dt,.05);if(jump&&grounded())velocity=8;move(dx,dz);velocity-=24*dt;const dy=velocity*dt,n=Math.max(1,Math.ceil(Math.abs(dy)/.1));for(let i=0;i<n;i++){const next=[position[0],position[1]+dy/n,position[2]];if(clear(next)){position=next;}else{let lo=0,hi=1;for(let k=0;k<10;k++){const mid=(lo+hi)/2;if(clear([position[0],position[1]+dy/n*mid,position[2]]))lo=mid;else hi=mid;}position[1]+=dy/n*lo;velocity=0;break;}}return [...position];}
 return {reset,move,tick,clear,grounded,position:()=>[...position]};
}
