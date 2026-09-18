// Pure placement UI state; the server remains authoritative for every write.
export function placementReadiness(draft,site,bridge,revisions=[]){
 const state=(kind,title,message)=>({kind,title,message,ready:kind==='ready'});
 if(!draft)return state('no-design','Choose a design','Open a design before preparing placement.');
 if(!bridge)return state('checking','Checking server','Checking the construction connection.');
 if(!bridge.connected)return state('offline','Server not connected','Start the test server, then refresh the connection.');
 if(bridge.capabilities?.placement===0)return state('read-only','This server allows surveys only','Connect a construction server before placing a design.');
 if(!site)return state('no-site','Choose a placement site',`Prepare a copy of this design on a surveyed site in ${bridge.world}.`);
 if(site.world!==bridge.world)return state('world-mismatch','This design is on another world',`The design uses ${site.world}; the connected server is ${bridge.world}. Prepare a placement copy below.`);
 if(!site.worldId||site.worldId!==bridge.worldId)return state('identity-mismatch','This survey belongs to another world copy','Choose a survey captured from the connected server. Matching world names alone are not enough.');
 if(!draft.valid)return state('invalid','The design needs changes',draft.diagnostics?.slice(0,2).join(' · ')||'Review the site fit and design findings before saving.');
 if(!revisions.some(r=>r.draftId===draft.id&&r.artifactHash===draft.candidate.hash&&r.surveyHash===draft.surveyHash))return state('unsaved','Save this placement version','Save the design on this site, then preview the changes before placing.');
 return state('ready','Ready to preview',`Preview the exact changes in ${bridge.world} before placing any blocks.`);
}
export function compatibleSites(sites,bridge){return bridge?.connected?sites.filter(s=>s.world===bridge.world&&s.worldId&&s.worldId===bridge.worldId&&s.plot.min.every((n,i)=>n>=bridge.minimum[i])&&s.plot.max.every((n,i)=>n<=bridge.maximum[i])):[];}
export function placementFit(candidate,site,transform){
 if(!site||!transform.origin.every(Number.isSafeInteger)||!Number.isInteger(transform.turns)||transform.turns<0||transform.turns>3)return {fits:false,message:'Choose a site and whole-block position.'};
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const c of candidate.blocks){let x=c.x,z=c.z,w=candidate.dimensions.x,d=candidate.dimensions.z;for(let i=0;i<transform.turns;i++){[x,z]=[d-1-z,x];[w,d]=[d,w];}const p=[x+transform.origin[0],c.y+transform.origin[1],z+transform.origin[2]];for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]+1);}}
 const fits=min.every((n,i)=>n>=site.plot.min[i])&&max.every((n,i)=>n<=site.plot.max[i]);
 return {fits,message:fits?'Fits the plot bounds. The copy will also be checked for protected areas and access.':`Outside this plot. Design write area: ${max[0]-min[0]} × ${max[2]-min[2]}, ${max[1]-min[1]} high; plot: ${site.plot.max[0]-site.plot.min[0]} × ${site.plot.max[2]-site.plot.min[2]}, ${site.plot.max[1]-site.plot.min[1]} high. Adjust the position or rotation, or use a larger surveyed plot.`};
}

export function placementErrorMessage(message){
 if(/Survey world (differs|identity)/.test(message))return 'This design belongs to another world. Open Build and prepare a copy for the connected server.';
 const block=/Block not in tested placement allowlist: ([A-Z0-9_]+)/.exec(message);
 if(block)return `Placement is blocked by ${block[1].toLowerCase().replaceAll('_',' ')}. The bridge does not yet support changing or restoring this block. The placement adapter needs support for it before this design can be placed here.`;
 return message;
}
