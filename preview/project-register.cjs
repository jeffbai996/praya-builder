const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');

const idFor=key=>createHash('sha256').update('praya-project-location-v1:'+key).digest('hex');
const family=project=>project.split(':')[0];
const cleanName=name=>name.replace(/ · (?:R\d+|Praya detail pass)$/,'');
const types={
 'north-plot-point-tower':'Apartments','courtyard-apartments':'Apartments','rosedale-court':'Apartments',
 'study-bar':'Apartments','study-court':'Apartments','study-staggered':'Apartments','alder-house':'Apartments',
 'terraced-brick-residences':'Houses','terrace-mews':'Houses','braemar-frame-house':'Houses',
 'garden-medical-clinic':'Healthcare','braemarhealth-hillside-clinic':'Healthcare',
 'civic-reading-room':'Civic & education','parkside-elementary':'Civic & education',
 'oakville-corner-stores':'Shops & mixed use','go-corner-market':'Shops & mixed use'
};
const emptyLocation=()=>({number:'',street:'',unit:'',municipality:'',neighbourhood:'',status:'unverified',source:''});
const label=l=>[l.number,l.street,l.unit&&'Unit '+l.unit].filter(Boolean).join(' ');
const summary={
 drafts:d=>({id:d.id,project:d.project,name:d.plan.name,revision:d.plan.revision,siteId:d.siteId,valid:d.valid,candidateHash:d.candidate.hash,createdAt:d.createdAt}),
 revisions:r=>({id:r.id,project:r.project,draftId:r.draftId,siteId:r.siteId,name:r.plan.name,revision:r.plan.revision,artifactHash:r.artifactHash,createdAt:r.createdAt}),
 sites:s=>({id:s.id,name:s.name,world:s.world,worldId:s.worldId,origin:s.origin,capturedAt:s.capturedAt})
};
class ProjectRegister{
 constructor(store){this.store=store;this.cache=new Map();}
 // Keep only small summaries in memory. Unchanged plans and surveys are not parsed again.
 records(kind){
  const dir=path.join(this.store.root,kind);if(!fs.existsSync(dir))return [];
  const present=new Set(),records=[];
  for(const name of fs.readdirSync(dir).filter(n=>/^[a-z0-9-]+\.json$/.test(n))){
   const file=path.join(dir,name),stat=fs.statSync(file),stamp=stat.mtimeMs+':'+stat.ctimeMs+':'+stat.size;present.add(file);
   let cached=this.cache.get(file);if(!cached||cached.stamp!==stamp){cached={stamp,value:summary[kind](JSON.parse(fs.readFileSync(file,'utf8')))};this.cache.set(file,cached);}records.push(cached.value);
  }
  for(const file of this.cache.keys())if(path.dirname(file)===dir&&!present.has(file))this.cache.delete(file);
  return records;
 }
 snapshot(){
  const drafts=this.records('drafts'),revisions=this.records('revisions'),sites=new Map(this.records('sites').map(s=>[s.id,s]));
  const metadata=new Map(this.store.list('project-locations').map(r=>[r.id,r])),groups=new Map();
  for(const record of [...drafts,...revisions]){const key=family(record.project);if(!groups.has(key))groups.set(key,{key,drafts:[],saved:[]});groups.get(key)[record.candidateHash?'drafts':'saved'].push(record);}
  return [...groups.values()].map(g=>{
   g.saved.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
   const touched=d=>[d.createdAt,...g.saved.filter(r=>r.draftId===d.id).map(r=>r.createdAt)].sort().at(-1);
   g.drafts.sort((a,b)=>touched(b).localeCompare(touched(a))||a.id.localeCompare(b.id));
   const current=g.drafts.find(d=>d.valid)||g.drafts[0];
   const applications=[...new Set([...g.drafts,...g.saved].map(r=>r.project))].sort().map(project=>{
    const record=g.drafts.find(d=>d.project===project)||g.saved.find(r=>r.project===project),id=idFor(project),saved=metadata.get(id),site=sites.get(record.siteId)||null;
    return {id,project,version:saved?.version||0,siteId:record.siteId||null,site,location:saved?.location||emptyLocation(),updatedAt:saved?.updatedAt||null};
   });
   const last=g.saved[0];
   return {...g,name:cleanName(current?.name||last.name),type:types[g.key]||'Other',draftId:current?.id||null,
    revision:current?g.saved.find(r=>r.draftId===current.id&&r.artifactHash===current.candidateHash)||null:last,
    savedAt:current?touched(current):last.createdAt,applications};
  });
 }
 list(params=new URLSearchParams()){
  const all=this.snapshot(),query=(params.get('q')||'').trim().toLocaleLowerCase();if(query.length>240)throw Error('Search must be at most 240 characters');
  const type=params.get('type')||'',municipality=params.get('municipality')||'',assignment=params.get('assignment')||'',sort=params.get('sort')||'recent';
  if(!['','unassigned','surveyed','addressed'].includes(assignment)||!['recent','name','address'].includes(sort))throw Error('Unknown library filter');
  const matchedApplications=new Map();
  const matches=all.filter(g=>{const selected=g.applications.filter(a=>{
   const l=a.location;
   if(municipality&&l.municipality!==municipality)return false;
   if(assignment==='unassigned'&&(a.siteId||label(l)))return false;
   if(assignment==='surveyed'&&!a.siteId)return false;
   if(assignment==='addressed'&&!label(l))return false;
   return query.split(/\s+/).every(q=>[g.name,g.type,...g.drafts.map(d=>d.name),a.site?.name,...Object.values(l)].join(' ').toLocaleLowerCase().includes(q));
  });matchedApplications.set(g.key,selected);return (!type||g.type===type)&&selected.length;}).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='address'?(label(matchedApplications.get(a.key)[0].location)||'\uffff').localeCompare(label(matchedApplications.get(b.key)[0].location)||'\uffff',undefined,{numeric:true})||a.name.localeCompare(b.name):b.savedAt.localeCompare(a.savedAt)||a.name.localeCompare(b.name));
  const requested=Number(params.get('page')||0),size=Number(params.get('size')||6);
  if(!Number.isInteger(requested)||requested<0||!Number.isInteger(size)||size<1||size>24)throw Error('Invalid library page');
  const pages=Math.max(1,Math.ceil(matches.length/size)),page=Math.min(requested,pages-1);
  const compact=(g,applications=g.applications)=>{const {drafts,saved,...rest}=g,allowed=new Set(applications.map(a=>a.project)),draft=drafts.find(d=>allowed.has(d.project)&&d.valid)||drafts.find(d=>allowed.has(d.project));return {...rest,applications,draftId:draft?.id||null,revision:draft?saved.find(r=>r.draftId===draft.id&&r.artifactHash===draft.candidateHash)||null:saved.find(r=>allowed.has(r.project)),draftCount:drafts.length,versionCount:saved.length};};
  return {schemaVersion:1,items:matches.slice(page*size,(page+1)*size).map(g=>compact(g,matchedApplications.get(g.key))),total:matches.length,projectCount:all.length,page,pages,size,
   types:[...new Set(all.map(g=>g.type))].sort(),municipalities:[...new Set(all.flatMap(g=>g.applications.map(a=>a.location.municipality)).filter(Boolean))].sort(),
   recent:all.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).find(g=>g.draftId)?compact(all.find(g=>g.draftId)):null};
 }
 detail(key){const record=this.snapshot().find(g=>g.key===key);if(!record){const e=Error('Project not found');e.status=404;throw e;}return record;}
 update(id,input){
  const application=this.snapshot().flatMap(g=>g.applications).find(a=>a.id===id);
  if(!application){const e=Error('Project location not found');e.status=404;throw e;}
  if(input.expectedVersion!==application.version){const e=Error('Location changed. Close and reopen it before saving.');e.status=409;throw e;}
  const location=emptyLocation(),data=input.location;
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Location details are required');
  for(const key of Object.keys(data))if(!Object.hasOwn(location,key))throw Error('Unknown location field');
  for(const key of Object.keys(location)){const v=data[key]??location[key];if(typeof v!=='string'||v.length>(key==='source'?500:120)||/[\u0000-\u001f]/.test(v))throw Error('Invalid '+key);location[key]=v.trim();}
  if(!['unverified','verified'].includes(location.status))throw Error('Unknown address status');
  if((location.number||location.unit)&&!location.street)throw Error('Add a street for this number or unit');
  if(location.status==='verified'&&(!location.street||!location.source))throw Error('A verified address needs a street and a source');
  const record={schemaVersion:1,project:application.project,siteId:application.siteId,location,updatedAt:new Date().toISOString()};
  if(application.version)return this.store.update('project-locations',id,input.expectedVersion,record);
  const first={...record,id,version:1,createdAt:record.updatedAt};this.store.write(this.store.file('project-locations',id),first,true);return first;
 }
}
module.exports={ProjectRegister,idFor};
