const {air,assessSite,transformCells}=require('./sites.cjs');
const {checkAccess,inversePoint}=require('./accessibility.cjs');
const {resolveConnections}=require('./thin-block-connections.cjs');
const {stateBlock}=require('./mesh.cjs');

const DIAGNOSTICS_VERSION=1;
const RULES=Object.freeze({
 'compile.invalid-plan':{version:1,severity:'error'},
 'bounds.survey-cap':{version:1,severity:'error'},
 'bounds.survey':{version:1,severity:'error'},
 'bounds.plot':{version:1,severity:'error'},
 'site.protected':{version:1,severity:'error'},
 'walk.street-unreachable':{version:1,severity:'error'},
 'walk.door-unreachable':{version:1,severity:'error'},
 'walk.headroom':{version:1,severity:'warning'},
 'support.floating':{version:1,severity:'warning'},
 'roof.uncovered':{version:1,severity:'warning'},
 'light.dark-corridor':{version:1,severity:'info'},
 'sign.orphan':{version:1,severity:'error'},
 'pane.unresolved':{version:1,severity:'warning'},
});
const RULE_VERSIONS=Object.freeze(Object.fromEntries(Object.entries(RULES).map(([id,rule])=>[id,rule.version])));
const key=p=>p.join(',');
const base=state=>state.split('[')[0];
const inside=(p,dimensions)=>p[0]>=0&&p[0]<dimensions.x&&p[1]>=0&&p[1]<dimensions.y&&p[2]>=0&&p[2]<dimensions.z;
const format=p=>`[${p.join(',')}]`;
const diagnostic=(rule,{component=null,at=null,message,hint=null})=>({rule,version:RULES[rule].version,severity:RULES[rule].severity,component,at,message,hint});
const nonAir=state=>state&&!air(state);

function geometry(candidate,site,transform){
 const plan=new Map(candidate.blocks.map(c=>[key([c.x,c.y,c.z]),c]));
 const world=new Map(),owned=new Map(),placed=[];
 if(site)for(const c of site.blocks){const p=[c.x+site.origin[0],c.y+site.origin[1],c.z+site.origin[2]];world.set(key(p),{...c,x:p[0],y:p[1],z:p[2],component:'context'});}
 if(site){
  const transformed=transformCells(candidate,transform);
  for(let i=0;i<transformed.length;i++){
   const cell={...transformed[i],plan:[candidate.blocks[i].x,candidate.blocks[i].y,candidate.blocks[i].z]};
   const k=key([cell.x,cell.y,cell.z]);world.set(k,cell);owned.set(k,cell);placed.push(cell);
  }
 }else for(const c of candidate.blocks){const cell={...c,plan:[c.x,c.y,c.z]};world.set(key(cell.plan),cell);owned.set(key(cell.plan),cell);placed.push(cell);}
 return {plan,world,owned,placed,candidate,site,transform};
}

function planAtWorld(cell,site,candidate,transform){
 if(cell.plan)return cell.plan;
 return inversePoint([cell.x-site.origin[0],cell.y-site.origin[1],cell.z-site.origin[2]],site,candidate,transform);
}

function boundsDiagnostics(candidate,site,transform,assessment){
 if(!site)return [];
 const groups=new Map();
 const cap=site.origin[1]+site.dimensions.y;
 for(const error of assessment.errors||[]){
  let rule;
  if(error.reason==='Unknown context')rule=error.y>=cap?'bounds.survey-cap':'bounds.survey';
  else if(error.reason==='Outside plot')rule='bounds.plot';
  else if(error.reason==='Protected area')rule='site.protected';
  else continue;
  if(!groups.has(rule))groups.set(rule,[]);groups.get(rule).push(error);
 }
 const entries=[];
 for(const [rule,errors]of groups){
  errors.sort((a,b)=>a.y-b.y||a.x-b.x||a.z-b.z);
  const first=errors.find(c=>nonAir(c.block))||errors[0],at=planAtWorld(first,site,candidate,transform),count=errors.length;
  if(rule==='bounds.survey-cap'){
   const top=Math.max(...errors.map(c=>c.y));
   entries.push(diagnostic(rule,{component:first.component,at,message:`${count} owned cell${count===1?'':'s'} reach world Y${top}, but the survey stops at Y${cap}.`,hint:`Y${cap} is the first unknown layer; capture a taller survey or lower the design.`}));
  }else if(rule==='bounds.survey')entries.push(diagnostic(rule,{component:first.component,at,message:`${count} owned cell${count===1?' is':'s are'} outside the surveyed volume.`,hint:`First unknown cell is ${format(at)} in plan coordinates.`}));
  else if(rule==='bounds.plot')entries.push(diagnostic(rule,{component:first.component,at,message:`${count} owned cell${count===1?' is':'s are'} outside the selected plot.`,hint:`Move or revise the design; first outside cell is ${format(at)}.`}));
  else entries.push(diagnostic(rule,{component:first.component,at,message:`${count} owned cell${count===1?' intersects':'s intersect'} a protected volume.`,hint:`First protected cell is ${format(at)}; protected surroundings cannot be changed.`}));
 }
 return entries;
}

function walkDiagnostics(candidate,access){
 if(!access?.checked)return [];
 const entries=[];
 for(const issue of access.issues||[]){
  if(issue.reason.startsWith('Street connection')){
   entries.push(diagnostic('walk.street-unreachable',{at:issue.at,message:'Street frontage is not a supported two-block-high walking position.',hint:'Provide a solid approach with two clear blocks above it.'}));
   continue;
  }
  if(!issue.reason.startsWith('Entrance'))continue;
  const nearest=issue.nearestReached?`Nearest reached cell ${format(issue.nearestReached)}.`:'No walking cell was reached from the street frontage.';
  const blocker=issue.blocker?` Blocked at ${format(issue.blocker.at)} by ${issue.blocker.block}${issue.blocker.component?` (${issue.blocker.component})`:''}.`:'';
  entries.push(diagnostic('walk.door-unreachable',{component:issue.component||null,at:issue.at,message:'No supported two-block-high route from the street frontage.',hint:nearest+blocker}));
 }
 const analysis=access._analysis;
 if(analysis){
  const seen=new Set();
  for(const issue of analysis.headroom){
   if(issue.at[1]<=0||!inside(issue.blockedAt,candidate.dimensions)||issue.component==='context'||seen.has(key(issue.blockedAt)))continue;
   seen.add(key(issue.blockedAt));
   entries.push(diagnostic('walk.headroom',{component:issue.component,at:issue.at,message:'A supported route has less than two blocks of headroom.',hint:`Blocked at ${format(issue.blockedAt)} by ${issue.block}${issue.component?` (${issue.component})`:''}.`}));
  }
 }
 return entries;
}

function floatingDiagnostics(candidate,geo){
 const excluded=state=>/(?:_leaves|_pane|iron_bars|lantern|_sign)(?:\[|$)/.test(state);
 const offsets=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],entries=[];
 for(const cell of geo.placed){
  if(air(cell.block)||excluded(cell.block))continue;
  const p=[cell.x,cell.y,cell.z];
  if(offsets.every(d=>!nonAir(geo.world.get(key(p.map((v,i)=>v+d[i])))?.block))){
   entries.push(diagnostic('support.floating',{component:cell.component||null,at:cell.plan,message:'A non-air cell has air on all six faces.',hint:`${cell.block} is isolated; connect it or remove it.`}));
  }
 }
 return entries;
}

function roofDiagnostics(candidate,geo){
 const entries=[];
 for(const space of candidate.spaces||[]){
  const uncovered=[];
  for(let x=space.min[0];x<space.max[0];x++)for(let z=space.min[2];z<space.max[2];z++){
   const floorAt=[x,space.min[1]-1,z],floor=geo.plan.get(key(floorAt));if(!floor||air(floor.block))continue;
   let covered=false;for(let y=space.min[1];y<candidate.dimensions.y;y++)if(nonAir(geo.plan.get(key([x,y,z]))?.block)){covered=true;break;}
   if(!covered)uncovered.push({at:floorAt,component:floor.component});
  }
  if(uncovered.length){const first=uncovered[0];entries.push(diagnostic('roof.uncovered',{component:first.component,at:first.at,message:`${uncovered.length} interior floor cell${uncovered.length===1?' has':'s have'} no non-air block above.`,hint:`Space ${space.id||'(unnamed)'} is open to the sky above ${format(first.at)}.`}));}
 }
 return entries;
}

function lightDiagnostics(candidate,geo,access){
 const analysis=access?._analysis;if(!analysis)return [];
 const emits=state=>{
  const name=base(state);
  if(/(?:redstone_torch|redstone_wall_torch)$/.test(name))return !/\blit=false\b/.test(state);
  if(/(?:redstone_lamp|campfire|candle)$/.test(name))return /\blit=true\b/.test(state);
  return /(?:sea_lantern|lantern|torch|glowstone|shroomlight|froglight|end_rod|beacon|glow_lichen|lava|fire)$/.test(name);
 };
 const lights=[];
 for(const cell of geo.world.values())if(emits(cell.block))lights.push(cell.plan||planAtWorld(cell,geo.site,candidate,geo.transform));
 const dark=[];
 for(const p of analysis.reachedPoints){
  if(!inside(p,candidate.dimensions))continue;
  const distance=lights.length?Math.min(...lights.map(l=>Math.abs(l[0]-p[0])+Math.abs(l[1]-p[1])+Math.abs(l[2]-p[2]))):Infinity;
  if(distance>8)dark.push({at:p,distance});
 }
 if(!dark.length)return [];
 dark.sort((a,b)=>b.distance-a.distance||key(a.at).localeCompare(key(b.at)));
 const worst=dark[0],floor=geo.plan.get(key([worst.at[0],worst.at[1]-1,worst.at[2]]));
 return [diagnostic('light.dark-corridor',{component:floor?.component||null,at:worst.at,message:`${dark.length} reached cell${dark.length===1?' is':'s are'} farther than 8 blocks from a known light-emitting block.`,hint:lights.length?`Farthest route cell ${format(worst.at)} is ${worst.distance} blocks from a light.`:'No known light-emitting block was found in the candidate.'})];
}

function signDiagnostics(candidate,geo){
 const entries=[],wallSigns=candidate.blocks.filter(c=>base(c.block).endsWith('_wall_sign'));
 for(const sign of candidate.signs||[]){
  const cell=geo.plan.get(key(sign.at));
  if(!cell||!base(cell.block).endsWith('_wall_sign'))entries.push(diagnostic('sign.orphan',{component:cell?.component||null,at:sign.at,message:'Sign text is not attached to a wall-sign block.',hint:cell?`The owned cell is ${cell.block}.`:'No owned cell exists at this position.'}));
 }
 const direction={north:[0,0,1],south:[0,0,-1],east:[-1,0,0],west:[1,0,0]};
 for(const sign of wallSigns){
  const facing=/\bfacing=(north|east|south|west)\b/.exec(sign.block)?.[1],offset=direction[facing];if(!offset)continue;
  const placed=geo.placed.find(c=>c.plan[0]===sign.x&&c.plan[1]===sign.y&&c.plan[2]===sign.z),p=placed?[placed.x,placed.y,placed.z]:[sign.x,sign.y,sign.z];
  // transformCells already rotated the wall-sign state; use its facing after placement.
  const placedFacing=placed?/\bfacing=(north|east|south|west)\b/.exec(placed.block)?.[1]:facing,behind=direction[placedFacing],support=behind&&geo.world.get(key(p.map((v,i)=>v+behind[i])));
  if(!support||air(support.block))entries.push(diagnostic('sign.orphan',{component:sign.component||null,at:[sign.x,sign.y,sign.z],message:'Wall sign has no supporting block behind it.',hint:`Add a supporting block behind the ${placedFacing||facing}-facing sign.`}));
 }
 return entries;
}

function paneDiagnostics(candidate){
 const resolved=resolveConnections(candidate.blocks).blocks,entries=[];
 for(let i=0;i<candidate.blocks.length;i++){
  const before=candidate.blocks[i],name=base(before.block);if(!(name.endsWith('_pane')||name==='minecraft:iron_bars')||stateBlock(before.block).stateId===stateBlock(resolved[i].block).stateId)continue;
  entries.push(diagnostic('pane.unresolved',{component:before.component||null,at:[before.x,before.y,before.z],message:'Pane or bar connection flags disagree with neighbouring blocks.',hint:`Expected ${resolved[i].block}; compiled ${before.block}.`}));
 }
 return entries;
}

function diagnose(candidate,site,transform,options={}){
 if(!candidate||!candidate.dimensions||!Array.isArray(candidate.blocks))throw Error('A compiled candidate is required');
 const assessment=site?(options.assessment||assessSite(site,candidate,transform)):null;
 const access=site?(options.access||checkAccess(site,candidate,transform)):null;
 const geo=geometry(candidate,site,transform);
 return [
  ...boundsDiagnostics(candidate,site,transform,assessment),
  ...walkDiagnostics(candidate,access),
  ...floatingDiagnostics(candidate,geo),
  ...roofDiagnostics(candidate,geo),
  ...lightDiagnostics(candidate,geo,access),
  ...signDiagnostics(candidate,geo),
  ...paneDiagnostics(candidate),
 ];
}

module.exports={diagnose,DIAGNOSTICS_VERSION,RULES,RULE_VERSIONS};
