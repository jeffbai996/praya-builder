const fs=require('node:fs');
const path=require('node:path');
const {FileStore}=require('./workspace-store.cjs');
const {DesignService,diff}=require('./design-service.cjs');
const {importSite,transformCells}=require('./sites.cjs');
const {meshArtifact}=require('./mesh.cjs');
const {exportSchematic}=require('./schematic.cjs');
const {fixture}=require('./site-fixtures.cjs');
const {apartmentStudy}=require('./apartment-studies.cjs');
const {ConstructionService,PaperBridge}=require('./construction-service.cjs');
const {claimWorkspace}=require('./workspace-lock.cjs');
const {CaptureService}=require('./capture-service.cjs');
const {siteView}=require('./site-view.cjs');
const {integrationConfig,parseMapLocation,selectionMetadata,captureGuide,placementPackage}=require('./map-integration.cjs');
function readBody(req){return new Promise((resolve,reject)=>{
 let size=0,parts=[],failed=false;
 req.on('data',part=>{size+=part.length;if(size>12*1024*1024){failed=true;parts=[];}else if(!failed)parts.push(part);});
 req.on('end',()=>{try{if(failed)throw Error('Request byte limit exceeded');resolve(JSON.parse(Buffer.concat(parts).toString('utf8')||'{}'));}catch(error){reject(error);}});req.on('error',reject);
});}
function siteMesh(site){
 const tiles=new Map();
 for(const c of site.blocks){const origin=[c.x,c.y,c.z].map(v=>Math.floor(v/16)*16),key=origin.join(',');if(!tiles.has(key))tiles.set(key,{origin,blocks:[]});tiles.get(key).blocks.push({...c,x:c.x-origin[0],y:c.y-origin[1],z:c.z-origin[2]});}
 const sections=[];
 for(const {origin,blocks} of tiles.values()){
  const mesh=meshArtifact({hash:site.hash,dimensions:{x:16,y:16,z:16},blocks},16);
  for(const part of mesh.sections)sections.push({...part,sx:part.sx+origin[0],sy:part.sy+origin[1],sz:part.sz+origin[2]});
 }
 return {hash:site.hash,sections,ceiling:site.dimensions.y};
}
function workspaceApi({artifacts,port}){
 const store=new FileStore(process.env.BUILDER_WORKSPACE_DIR||path.join(__dirname,'.workspace'));
 claimWorkspace(store.root);
 const service=new DesignService(store),construction=new ConstructionService(store),cached=new Map();
 const surveyBridge=process.env.BUILDER_SURVEY_URL?new PaperBridge({url:process.env.BUILDER_SURVEY_URL,token:process.env.BUILDER_SURVEY_TOKEN||''}):construction.bridge;
 const captures=new CaptureService(store,surveyBridge,{busy:()=>Boolean(construction.active)});
 const origins=new Set([`http://localhost:${port}`,`http://127.0.0.1:${port}`]);if(process.env.PREVIEW_PUBLIC_ORIGIN)origins.add(new URL(process.env.PREVIEW_PUBLIC_ORIGIN).origin);
 async function handle(req,res,url){
  if(!url.pathname.startsWith('/api/workspace/'))return false;
  const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
   const route=url.pathname.slice('/api/workspace/'.length),write=!['GET','HEAD'].includes(req.method);
   if(write&&req.headers.origin&&!origins.has(req.headers.origin)){send({error:'Origin not allowed'},403);return true;}
   if(write&&req.headers['x-builder-write']!=='1'){send({error:'X-Builder-Write header required'},403);return true;}
   const body=write?await readBody(req):null;
   if(route==='context'&&req.method==='GET')send({schemaVersion:1,sites:store.list('sites').map(({blocks,...s})=>({...s,cells:blocks.length})),drafts:store.list('drafts').map(d=>({id:d.id,name:d.plan.name,version:d.version,valid:d.valid,candidateHash:d.candidate.hash,siteId:d.siteId})),revisions:store.list('revisions'),jobs:store.list('jobs').map(j=>({id:j.id,state:j.state,kind:j.kind,artifactHash:j.artifactHash,world:j.world,createdAt:j.createdAt})),limits:{buildCells:10000,surveyVolume:262144,queue:4},models:'External agent workflow; no provider calls'});
   else if(route==='integration'&&req.method==='GET'){const config=integrationConfig(),target=await captures.status();send({...config,capture:target.connected&&target.world===config.world&&target.capabilities?.survey===1?'paper-survey':'worldedit-schematic',selections:store.list('selections'),captures:store.list('captures').map(({selection,...job})=>job)});}
   else if(route==='capture/status'&&req.method==='GET')send(await captures.status());
   else if(route==='capture/selection'&&req.method==='POST'){
    const target=await captures.status();if(!target.connected||target.capabilities?.survey!==1)throw Error('Automatic capture adapter unavailable');
    const [width,height,depth]=target.maximum.map((n,i)=>n-target.minimum[i]);
    send(store.create('selections',selectionMetadata({name:'Connected capture area',x:target.minimum[0]+Math.floor(width/2),z:target.minimum[2]+Math.floor(depth/2),base:target.minimum[1],width,height,depth,frontageHeight:'terrain'},{world:target.world})),201);
   }
   else if(/^captures\/[a-z0-9-]+(?:\/cancel)?$/.test(route)){
    const [,id,action]=route.split('/');
    if(req.method==='GET'&&!action)send({...store.get('captures',id),active:captures.active===id});
    else if(req.method==='POST'&&action==='cancel')send(captures.cancel(id));
    else send({error:'Unknown capture operation'},404);
   }
   else if(route==='map-location'&&req.method==='POST')send(parseMapLocation(body.url,integrationConfig()));
   else if(route==='selections'&&req.method==='POST')send(store.create('selections',selectionMetadata(body,integrationConfig())),201);
   else if(/^selections\/[a-z0-9-]+(?:\/(?:import|capture))?$/.test(route)){
    const [,id,action]=route.split('/'),selection=store.get('selections',id);
    if(req.method==='GET'&&!action)send({...selection,guide:captureGuide(selection)});
    else if(req.method==='POST'&&action==='capture')send(await captures.start(id),202);
    else if(req.method==='POST'&&action==='import'){
     if(typeof body.schematic!=='string'||body.schematic.length>12*1024*1024)throw Error('Expected a bounded schematic');
     const metadata={...selection,capturedAt:body.capturedAt};
     const survey=importSite(Buffer.from(body.schematic,'base64'),metadata);
     if(['x','y','z'].some(axis=>survey.dimensions[axis]!==selection.dimensions[axis]))throw Error('Schematic dimensions differ from the selected capture area');
     send(store.create('sites',{...survey,selectionId:id}),201);
    }else send({error:'Unknown selection operation'},404);
   }
   else if(/^revisions\/[a-z0-9-]+\/handoff$/.test(route)&&req.method==='GET'){
    const revision=store.get('revisions',route.split('/')[1]);
    if(!revision.siteId)throw Error('This revision has no surveyed site');
    send(placementPackage(revision,store.get('sites',revision.siteId),store.getArtifact(revision.artifactHash)));
   }
   else if(route==='construction/status'&&req.method==='GET')send(await construction.status());
   else if(route==='construction/prepare'&&req.method==='POST')send(await construction.prepare(body.draftId,body),201);
   else if(/^construction\/jobs\/[a-z0-9-]+(?:\/[a-z]+)?$/.test(route)){
    const [,,id,action]=route.split('/');
    if(req.method==='GET'&&!action)send({...store.get('jobs',id),active:construction.active===id});
    else if(req.method==='POST'&&action==='apply'){if(captures.busy)throw Error('Wait for the active survey capture before placing blocks');send(construction.apply(id,body));}
    else if(req.method==='POST'&&action==='pause')send({...construction.pause(id),active:construction.active===id});
    else if(req.method==='POST'&&action==='reconcile')send(await construction.reconcile(id));
    else if(req.method==='POST'&&action==='rollback')send(await construction.rollback(id));
    else send({error:'Unknown construction operation'},404);
   }
   else if(route==='fixtures'&&req.method==='POST')send(store.create('sites',fixture(body.kind)),201);
   else if(route==='proposals'&&req.method==='POST'){
    const site=store.get('sites',body.siteId);
    if(site.plot.max[0]-site.plot.min[0]<32||site.plot.max[2]-site.plot.min[2]<32)throw Error('This plot needs a bespoke plan; the apartment study template requires 32 by 32 buildable blocks');
    const base=1+Math.max(0,...site.blocks.filter(c=>c.x>=4&&c.x<28&&c.z>=5&&c.z<28).map(c=>c.y));
    const drafts=[];
    for(const kind of ['bar','staggered','court'])drafts.push(await service.createDraft({plan:apartmentStudy(kind,base),siteId:site.id,transform:{origin:site.origin,turns:0},brief:'Six one-bedroom apartments, usable circulation and a shared roof garden. Review every elevation and all interiors.'}));
    send(drafts,201);
   }
   else if(route==='sites'&&req.method==='POST'){
    if(typeof body.schematic!=='string'||body.schematic.length>12*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.schematic))throw Error('Expected base64 schematic');
    send(store.create('sites',importSite(Buffer.from(body.schematic,'base64'),body.metadata)),201);
   }else if(/^sites\/[a-z0-9-]+(?:\/mesh)?$/.test(route)&&req.method==='GET'){
    const [,id,kind]=route.split('/'),site=store.get('sites',id);
    if(kind==='mesh'){const depth=url.searchParams.get('depth')||'full',key=site.hash+':'+depth;if(!cached.has(key)){const view=siteView(site,depth);if(cached.size>=2)cached.delete(cached.keys().next().value);cached.set(key,{...siteMesh({...site,blocks:view.blocks}),floor:view.floor,surfaceY:view.surfaceY});}send(cached.get(key));}else send(site);
   }else if(route==='drafts'&&req.method==='POST'){
    if(body.catalogue){const a=artifacts.get(body.catalogue);if(!a)throw Error('Unknown catalogue revision');const [project,revision]=body.catalogue.split('/');const stem=project==='courtyard'?revision:`${project}-${revision}`;body.plan=JSON.parse(fs.readFileSync(path.join(__dirname,'generated',stem+'.plan.json'),'utf8'));store.putArtifact(a);body.parentHash=a.hash;}
    send(await service.createDraft(body),201);
   }else if(/^drafts\/[a-z0-9-]+(?:\/[a-z-]+)?$/.test(route)){
    const [,id,action]=route.split('/');
    if(req.method==='GET'){
     const d=store.get('drafts',id);
     if(action==='context')send(service.context(id));
     else if(action==='diff'){const baseline=d.baselineHash||d.parentHash||d.history[0].candidateHash;send(diff(d.candidate,store.getArtifact(baseline)));}
     else if(action==='mesh'){
      const ceiling=Number(url.searchParams.get('ceiling')??64);const a=d.candidate,turns=d.transform?.turns||0;
      const transformed={...a,dimensions:turns%2?{x:a.dimensions.z,y:a.dimensions.y,z:a.dimensions.x}:a.dimensions,blocks:transformCells(a,{origin:[0,0,0],turns})};
      send(meshArtifact(transformed,ceiling));
     }else if(action==='schematic'){res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="proposal-${id}.schem"`});res.end(exportSchematic(d.candidate));}
     else if(!action)send(d);else send({error:'Unknown operation'},404);
    }else if(req.method==='POST'){
     if(action==='edit')send(await service.editDraft(id,body));
     else if(action==='history')send(await service.history(id,body));
     else if(action==='save')send(service.save(id,body),201);
     else if(action==='request')send(service.request(id,body),201);
     else send({error:'Unknown operation'},404);
    }else send({error:'Method not allowed'},405);
   }else send({error:'Unknown workspace operation'},404);
  }catch(error){console.error('Workspace:',error.message);send({error:error.message},error.status||400);}
  return true;
 }
 return {handle,store,service};
}
module.exports={workspaceApi,siteMesh};
