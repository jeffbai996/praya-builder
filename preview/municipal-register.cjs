const fs=require('node:fs'),path=require('node:path'),{randomUUID,createHash}=require('node:crypto');
const kinds=['parcel','building','address','entrance'];
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(v,n=160)=>{if(typeof v!=='string'||v.length>n)fail('Invalid text field');return v.trim();};
const point=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=30000000);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function polygon(v){
 if(v==null)return null;
 if(!Array.isArray(v)||v.length<3||v.length>64||!v.every(p=>point(p,2)))fail('Boundary needs 3–64 X/Z vertices');
 if(new Set(v.map(p=>p.join(','))).size!==v.length)fail('Repeated boundary vertices');
 const between=(a,b,p)=>cross(a,b,p)===0&&p.every((x,i)=>x>=Math.min(a[i],b[i])&&x<=Math.max(a[i],b[i]));
 for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){
  if(j===i+1||(i===0&&j===v.length-1))continue;
  const a=v[i],b=v[(i+1)%v.length],c=v[j],d=v[(j+1)%v.length];
  if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||between(a,b,c)||between(a,b,d)||between(c,d,a)||between(c,d,b))fail('Boundary intersects itself');
 }
 const area=Math.abs(v.reduce((s,p,i)=>s+p[0]*v[(i+1)%v.length][1]-p[1]*v[(i+1)%v.length][0],0))/2;
 if(area<1||area>10000000)fail('Boundary area must be 1–10000000 blocks squared');
 return v;
}
class MunicipalRegister{
 constructor(root){this.root=root;this.dir=path.join(root,'municipal-register');this.file=path.join(this.dir,'register.json');}
 read(){if(!fs.existsSync(this.file))return {version:0,records:[],events:[]};return JSON.parse(fs.readFileSync(this.file,'utf8'));}
 normalize(input,state,id){
  if(!input||!kinds.includes(input.kind))fail('Choose parcel, building, address or entrance');
  const r={id,kind:input.kind,name:text(input.name),world:text(input.world),worldId:text(input.worldId||''),municipality:text(input.municipality||''),neighbourhood:text(input.neighbourhood||''),use:text(input.use||''),status:input.status||'proposed',verification:input.verification||'unverified',source:text(input.source||'',2000),boundary:polygon(input.boundary),position:input.position??null,links:input.links||[],surveys:input.surveys||[],designs:input.designs||[],street:text(input.street||''),number:text(input.number||'',40),unit:text(input.unit||'',40),alternate:text(input.alternate||'')};
  if(!r.name||!r.world)fail('Name and Minecraft world are required');
  if(!['proposed','observed','retired'].includes(r.status)||!['unverified','verified'].includes(r.verification))fail('Invalid status');
  if(r.verification==='verified'&&!r.source)fail('Verification requires a source');
  if(r.boundary&&!r.source)fail('Boundary requires a source note');
  if(r.kind==='address'&&(!r.street||!r.number))fail('Address requires existing street and civic number');
  if(r.position!==null&&!point(r.position,3))fail('Position must be Minecraft X/Y/Z');
  if(r.kind==='entrance'&&!r.position)fail('Entrance requires X/Y/Z');
  if(!Array.isArray(r.links)||r.links.length>64||new Set(r.links).size!==r.links.length)fail('Invalid links');
  for(const link of r.links){const target=state.records.find(x=>x.id===link);if(!target||link===id)fail('Unknown or self-linked place');if(target.world!==r.world||target.worldId!==r.worldId)fail('Linked places must share world identity');}
  for(const field of ['surveys','designs'])if(!Array.isArray(r[field])||r[field].length>32||new Set(r[field]).size!==r[field].length||r[field].some(v=>typeof v!=='string'||!/^[a-z0-9-]{1,80}$/.test(v)))fail('Invalid '+field+' links');
  r.surveyEvidence=r.surveys.map(sid=>{const f=path.join(this.root,'sites',sid+'.json');if(!fs.existsSync(f))fail('Unknown survey');const s=JSON.parse(fs.readFileSync(f));if(s.world!==r.world||(s.worldId||'')!==r.worldId)fail('Survey world differs from place');return {id:sid,hash:s.hash||createHash('sha256').update(JSON.stringify(s)).digest('hex'),capturedAt:s.capturedAt||s.createdAt||null,source:s.source||null};});
  for(const did of r.designs)if(!fs.existsSync(path.join(this.root,'drafts',did+'.json')))fail('Unknown design draft');
  return r;
 }
 transaction(body,{dryRun=false}={}){
  fs.mkdirSync(this.dir,{recursive:true,mode:0o700});const lock=path.join(this.dir,'write.lock');let fd;
  try{fd=fs.openSync(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')fail('Register is being updated; retry',409);throw e;}
  try{const state=this.read();if(body.expectedVersion!==state.version)fail('Register changed; reload before saving',409);
   if(!Array.isArray(body.records)||!body.records.length||body.records.length>100)fail('Save 1–100 records at a time');
   const now=new Date().toISOString(),saved=[],seen=new Set();
   for(const input of body.records){const old=input.id?state.records.find(r=>r.id===input.id):null;if(input.id&&!old)fail('Place not found',404);if(old&&old.kind!==input.kind)fail('Record kind cannot change');if(old&&(old.world!==input.world||old.worldId!==(input.worldId||'')))fail('World identity cannot change');
    const id=old?.id||randomUUID();if(seen.has(id))fail('Duplicate record in transaction');seen.add(id);
    const r={...this.normalize(input,state,id),version:(old?.version||0)+1,createdAt:old?.createdAt||now,updatedAt:now};
    if(old)state.records[state.records.indexOf(old)]=r;else state.records.push(r);saved.push(r);
    state.events.push({recordId:id,at:now,record:r});
   }
   const lineage=body.lineage;
   if(lineage){if(!['split','merge'].includes(lineage.type)||!Array.isArray(lineage.parents)||!lineage.parents.length||lineage.parents.length>32||new Set(lineage.parents).size!==lineage.parents.length||!text(lineage.source||'',2000))fail('Invalid lineage operation');
    const children=saved.filter(r=>!body.records.find(i=>i.id===r.id));
    if(lineage.type==='split'&&(lineage.parents.length!==1||children.length<2)||lineage.type==='merge'&&(lineage.parents.length<2||children.length!==1))fail('Split needs one parent and multiple children; merge needs multiple parents and one child');
    const parents=lineage.parents.map(id=>state.records.find(r=>r.id===id));if(parents.some(r=>!r||r.kind!=='parcel'||r.status==='retired')||children.some(r=>r.kind!=='parcel'||!r.boundary))fail('Lineage requires active parent parcels and bounded new parcels');
    if([...parents,...children].some(r=>r.world!==parents[0].world||r.worldId!==parents[0].worldId))fail('Lineage world mismatch');
    for(const p of parents){const retired={...p,status:'retired',version:p.version+1,updatedAt:now};state.records[state.records.indexOf(p)]=retired;state.events.push({recordId:p.id,at:now,record:retired});}
    state.events.push({at:now,lineage:{...lineage,children:children.map(r=>r.id)}});
   }
   state.version++;const bytes=JSON.stringify(state);if(Buffer.byteLength(bytes)>16*1024*1024)fail('Register storage limit reached');
   if(dryRun)return {version:state.version-1,count:saved.length};
   const temp=this.file+'.'+randomUUID()+'.tmp';try{const out=fs.openSync(temp,'wx',0o600);try{fs.writeFileSync(out,bytes);fs.fsyncSync(out);}finally{fs.closeSync(out);}fs.renameSync(temp,this.file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
   return {version:state.version,records:saved};
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
 }
 list(params){const state=this.read(),q=(params.get('q')||'').toLowerCase(),kind=params.get('kind'),world=params.get('world'),municipality=params.get('municipality');
  const identity=params.get('identity');
  const filtered=state.records.filter(r=>(!kind||r.kind===kind)&&(!world||r.world===world)&&(!identity||JSON.stringify([r.world,r.worldId])===identity)&&(!municipality||r.municipality===municipality)&&(!q||[r.name,r.street,r.number,r.unit,r.municipality,r.neighbourhood].join(' ').toLowerCase().includes(q)));
  const page=Math.max(0,Number(params.get('page'))||0)|0,size=24;
  return {version:state.version,total:filtered.length,page,pages:Math.ceil(filtered.length/size),worlds:[...new Set(state.records.map(r=>JSON.stringify([r.world,r.worldId])))].sort(),municipalities:[...new Set(state.records.map(r=>r.municipality).filter(Boolean))].sort(),items:filtered.slice(page*size,(page+1)*size),map:filtered.slice(0,500).map(({id,name,world,worldId,kind,status,verification,boundary,position})=>({id,name,world,worldId,kind,status,verification,boundary,position})),mapTruncated:filtered.length>500};
 }
 detail(id){const s=this.read(),record=s.records.find(r=>r.id===id);if(!record)fail('Place not found',404);return {version:s.version,record,history:s.events.filter(e=>e.recordId===id||e.lineage&&(e.lineage.parents.includes(id)||e.lineage.children.includes(id))),related:s.records.filter(r=>r.links.includes(id)||record.links.includes(r.id)).map(({id,name,kind})=>({id,name,kind}))};}
}
module.exports={MunicipalRegister,polygon};
