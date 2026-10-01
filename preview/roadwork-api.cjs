const fs = require('node:fs');
const path = require('node:path');
const {randomUUID, createHash} = require('node:crypto');
const {compileRoad, detectRoad, makeFixtureSurvey} = require('./roadwork-engine.cjs');
const {exportSchematic} = require('./schematic.cjs');

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validId = value => /^[a-z0-9-]{1,80}$/.test(value || '');
async function readBody(req) {
  const chunks=[]; let size=0;
  for await (const chunk of req) {
    size+=chunk.length;
    if(size>65536) throw Error('Roadwork request exceeds 64 KiB');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

function roadworkApi({root=process.env.BUILDER_WORKSPACE_DIR || path.join(__dirname,'.workspace'),port=8091}={}) {
  const directory=path.join(root,'roadwork');
  const origins=new Set([`http://localhost:${port}`,`http://127.0.0.1:${port}`]);
  if(process.env.PREVIEW_PUBLIC_ORIGIN) origins.add(new URL(process.env.PREVIEW_PUBLIC_ORIGIN).origin);
  function survey(id) {
    if(id==='fixture') return makeFixtureSurvey();
    if(!validId(id)) throw Error('Invalid survey id');
    const file=path.join(root,'sites',id+'.json');
    if(!fs.existsSync(file)) { const e=Error('Survey not found'); e.status=404; throw e; }
    return JSON.parse(fs.readFileSync(file,'utf8'));
  }
  function read(id) {
    if(!validId(id)) throw Error('Invalid study id');
    const file=path.join(directory,id+'.json');
    if(!fs.existsSync(file)) { const e=Error('Study not found'); e.status=404; throw e; }
    const record=JSON.parse(fs.readFileSync(file,'utf8'));
    const {recordHash,...content}=record;
    if(digest(content)!==recordHash) throw Error('Saved study integrity check failed');
    return record;
  }
  function list() {
    if(!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).filter(f=>/^[a-z0-9-]+\.json$/.test(f)).map(f=>read(f.slice(0,-5)));
  }
  function compile(input) {
    if(!input || !validId(input.surveyId)) throw Error('Choose a saved survey');
    const source=survey(input.surveyId);
    return {source,assembly:compileRoad({survey:source,points:input.points,width:input.width,alternative:input.alternative,section:input.section})};
  }
  function save(input) {
    const {source,assembly}=compile(input);
    if(input.hash!==assembly.hash) {const e=Error('The road changed. Generate and review it again before saving.');e.status=409;throw e;}
    if(typeof input.name!=='string' || !input.name.trim() || input.name.length>120) throw Error('Study name must contain 1–120 characters');
    const record={id:randomUUID(),name:input.name.trim(),createdAt:new Date().toISOString(),input:{surveyId:input.surveyId,points:input.points,width:assembly.width,alternative:input.alternative??'balanced',section:input.section??'provisional'},assembly,survey:source};
    record.recordHash=digest(record);
    const bytes=Buffer.from(JSON.stringify(record));
    if(bytes.length>24*1024*1024) throw Error('Study exceeds 24 MiB');
    fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const used=fs.readdirSync(directory).filter(f=>f.endsWith('.json')).reduce((total,file)=>total+fs.statSync(path.join(directory,file)).size,0);
    if(used+bytes.length>256*1024*1024) throw Error('Roadwork study storage is full');
    const file=path.join(directory,record.id+'.json'),temp=file+'.tmp';
    fs.writeFileSync(temp,bytes,{flag:'wx',mode:0o600});
    fs.renameSync(temp,file);
    return record;
  }
  function manifest(record) {
    const a=record.assembly;
    return {schema:'praya.roadwork.manifest.v1',name:record.name,studyId:record.id,assemblyHash:a.hash,surveyHash:a.surveyHash,world:a.world,worldId:a.worldId,ready:a.ready,issues:a.issues,source:record.survey.source||'imported-survey',createdAt:record.createdAt,
      placement:'Review package only. No world writes are performed by Roadwork. Origins are minimum X/Y/Z corners, without rotation.',
      airPolicy:'Sponge schematic rectangular air is not a change mask. Use the explicit changes and verify surveyed blocks before construction.',
      segments:a.segments.map(s=>({id:s.id,origin:s.origin,ports:s.ports,artifactHash:s.artifact.hash,dimensions:s.artifact.dimensions,file:s.id+'.schem'})),changes:a.changes,metrics:a.metrics};
  }
  async function handle(req,res,url) {
    if(!url.pathname.startsWith('/api/roadwork/')) return false;
    const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      const route=url.pathname.slice('/api/roadwork/'.length);
      if(!['GET','POST'].includes(req.method)){send({error:'Method not allowed'},405);return true;}
      if(req.method==='POST') {
        if(req.headers['x-builder-write']!=='1' || (req.headers.origin&&!origins.has(req.headers.origin))) {send({error:'Same-origin Roadwork write header required'},403);return true;}
      }
      if(route==='context'&&req.method==='GET') {
        const sites=path.join(root,'sites');
        const surveys=fs.existsSync(sites)?fs.readdirSync(sites).filter(f=>/^[a-z0-9-]+\.json$/.test(f)).map(f=>{const s=survey(f.slice(0,-5));return {id:f.slice(0,-5),name:s.name,world:s.world,worldId:s.worldId,origin:s.origin,dimensions:s.dimensions,source:s.source||'imported-survey',capturedAt:s.capturedAt};}):[];
        send({surveys,studies:list().map(s=>({id:s.id,name:s.name,createdAt:s.createdAt,hash:s.assembly.hash})),fixtureAvailable:true});
      } else if(/^surveys\/[a-z0-9-]+$/.test(route)&&req.method==='GET') {
        const s=survey(route.split('/')[1]),detection=detectRoad(s);
        send({survey:s,suggestedPoints:Array.isArray(detection)?detection:(detection.points||detection.suggestedPoints||[]),detection});
      } else if(route==='compile'&&req.method==='POST') send(compile(await readBody(req)).assembly);
      else if(route==='studies'&&req.method==='POST') send(save(await readBody(req)),201);
      else if(/^studies\/[a-z0-9-]+$/.test(route)&&req.method==='GET') send(read(route.split('/')[1]));
      else if(/^studies\/[a-z0-9-]+\/manifest$/.test(route)&&req.method==='GET') {
        const r=read(route.split('/')[1]);
        res.setHeader('Content-Disposition',`attachment; filename="roadwork-${r.id}.manifest.json"`);send(manifest(r));
      } else if(/^studies\/[a-z0-9-]+\/segments\/[a-z0-9-]+\.schem$/.test(route)&&req.method==='GET') {
        const parts=route.split('/'),r=read(parts[1]),segment=r.assembly.segments.find(s=>s.id===parts[3].slice(0,-6));
        if(url.searchParams.get('hash')!==r.assembly.hash){send({error:'Exact saved assembly hash required'},409);return true;}
        if(!segment){send({error:'Segment not found'},404);return true;}
        if(!r.assembly.ready){send({error:'Resolve road review issues before exporting schematics'},409);return true;}
        const bytes=exportSchematic(segment.artifact);
        res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${segment.id}.schem"`,'X-Artifact-Hash':segment.artifact.hash});res.end(bytes);
      } else send({error:'Roadwork operation not found'},404);
    } catch(error) {send({error:error.message},error.status||400);}
    return true;
  }
  return {handle,compile,save,read,list,manifest,survey};
}
module.exports={roadworkApi};
