// A read-only planning report. Construction still performs its own preflight and approval.
const point=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isSafeInteger);
const bounds=value=>value&&point(value.min)&&point(value.max)&&value.min.every((n,i)=>n<value.max[i]);
function readiness({integration,bridge,selection,job}){
 const blockers=[];
 const block=(code,message)=>blockers.push({code,message});
 if(!integration.mapUrl)block('map-missing','Configure the world map URL.');
 const connected=Boolean(bridge.connected&&typeof bridge.worldId==='string'&&bridge.worldId);
 if(!connected)block('bridge-unavailable','Connect an adapter that reports its exact world identity.');
 const worldMatches=connected&&bridge.world===integration.world;
 if(connected&&!worldMatches)block('world-mismatch','The adapter serves a different world from the map.');
 if(!selection)block('selection-missing','Choose a saved plot selection for the trial.');
 const reserved={min:bridge.minimum,max:bridge.maximum};
 const plotEligible=Boolean(worldMatches&&selection?.world===integration.world&&bounds(selection?.plot)&&bounds(reserved)&&selection.plot.min.every((n,i)=>n>=reserved.min[i]&&selection.plot.max[i]<=reserved.max[i]));
 if(selection&&!plotEligible)block('plot-unavailable','The selected plot must fit the connected world and all three reserved dimensions.');
 const placementReady=Boolean(plotEligible&&job?.state==='prepared'&&job.worldId===bridge.worldId&&job.world===selection.world&&/^[a-f0-9]{64}$/.test(job.artifactHash||'')&&/^[a-f0-9]{64}$/.test(job.surveyHash||'')&&/^[a-f0-9]{64}$/.test(job.changeHash||'')&&Array.isArray(job.changes)&&job.changes.length<=10000&&job.changes.every(c=>point([c.x,c.y,c.z])&&[c.x,c.y,c.z].every((n,i)=>n>=selection.plot.min[i]&&n<selection.plot.max[i])));
 if(!placementReady)block('review-required','Prepare and review a saved design against a fresh survey of this plot.');
 return {schemaVersion:1,mapConfigured:Boolean(integration.mapUrl),mapWorld:integration.world,bridgeConnected:connected,bridgeWorld:bridge.world||null,selectionId:selection?.id||null,plotEligible,placementReady,captureMode:integration.capture||'unknown',automaticCaptureAvailable:integration.capture==='paper-survey',blockers,note:'Read-only readiness assessment; it does not capture, approve, apply, or change server configuration.'};
}
async function main(){
 const [selectionId,jobId]=process.argv.slice(2);
 for(const id of [selectionId,jobId])if(id&&!/^[a-z0-9-]{1,80}$/.test(id))throw Error('Use saved selection and job IDs');
 const base=process.env.BUILDER_WORKSPACE_URL||'http://127.0.0.1:8091';
 async function get(route){const response=await fetch(new URL('/api/workspace/'+route,base),{signal:AbortSignal.timeout(20000)});const value=await response.json();if(!response.ok)throw Error(value.error||'Workspace request failed');return value;}
 const integration=await get('integration'),bridge=await get('construction/status');
 const selection=selectionId?await get('selections/'+selectionId):null;
 const job=jobId?await get('construction/jobs/'+jobId):null;
 console.log(JSON.stringify({...readiness({integration,bridge,selection,job}),checkedAt:new Date().toISOString()},null,2));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={readiness};
