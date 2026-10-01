const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {roadworkApi}=require('./roadwork-api.cjs');
const {makeFixtureSurvey}=require('./roadwork-engine.cjs');
const {readSchematic}=require('./site-nbt.cjs');

test('Roadwork HTTP compile, immutable save/reopen, manifest and exact schematic export',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roadwork-api-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const api=roadworkApi({root,port:18091});
  const server=http.createServer((req,res)=>api.handle(req,res,new URL(req.url,'http://localhost:18091')));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base=`http://127.0.0.1:${server.address().port}/api/roadwork/`;
  const get=route=>fetch(base+route);
  const post=(route,body,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1',...headers},body:JSON.stringify(body)});
  const context=await (await get('context')).json();
  assert.equal(context.fixtureAvailable,true);
  assert.deepEqual(context.studies,[]);
  const selection=await (await get('surveys/fixture')).json();
  assert.ok(selection.suggestedPoints.length>=2);
  const input={surveyId:'fixture',points:selection.suggestedPoints,width:7,alternative:'balanced'};
  const response=await post('compile',input);assert.equal(response.status,200);
  const assembly=await response.json();assert.equal(assembly.ready,true,JSON.stringify(assembly.issues));
  assert.ok(assembly.segments.length>=2);
  assert.equal((await post('studies',{...input,name:'Reviewed road',hash:'outdated'})).status,409);
  const savedResponse=await post('studies',{...input,name:'Reviewed road',hash:assembly.hash});assert.equal(savedResponse.status,201);
  const saved=await savedResponse.json();
  const reopened=await (await get('studies/'+saved.id)).json();
  assert.deepEqual(reopened.assembly,assembly);
  const manifest=await (await get('studies/'+saved.id+'/manifest')).json();
  assert.deepEqual(manifest.changes,assembly.changes);
  for(const segment of assembly.segments){
    const url=`studies/${saved.id}/segments/${segment.id}.schem`;
    assert.equal((await get(url)).status,409);
    const exported=await get(url+'?hash='+assembly.hash);assert.equal(exported.status,200);
    const nbt=readSchematic(Buffer.from(await exported.arrayBuffer()));
    assert.equal(nbt.Metadata.BuilderArtifactHash,segment.artifact.hash);
    assert.equal(nbt.Width,segment.artifact.dimensions.x);
  }
  assert.equal((await post('compile',input,{'Origin':'https://untrusted.example'})).status,403);
  assert.equal((await post('compile',input,{'X-Builder-Write':'0'})).status,403);
  assert.equal((await get('studies/missing')).status,404);
  const file=path.join(root,'roadwork',saved.id+'.json'),tampered=JSON.parse(fs.readFileSync(file));
  tampered.assembly.changes[0].after='minecraft:diamond_block';fs.writeFileSync(file,JSON.stringify(tampered));
  assert.equal((await get('studies/'+saved.id)).status,400);
});

test('saved studies retain their captured survey when the source record changes',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'roadwork-snapshot-'));
  try{
    const api=roadworkApi({root});
    const fixture=makeFixtureSurvey();
    fs.mkdirSync(path.join(root,'sites'));
    const file=path.join(root,'sites','survey-one.json');
    fs.writeFileSync(file,JSON.stringify(fixture));
    const {detectRoad}=require('./roadwork-engine.cjs');
    const input={surveyId:'survey-one',points:detectRoad(fixture).suggestedPoints,width:7,alternative:'balanced'};
    const assembly=api.compile(input).assembly;
    const saved=api.save({...input,name:'Pinned source',hash:assembly.hash});
    const changed={...fixture,name:'Later survey'};delete changed.hash;
    fs.writeFileSync(file,JSON.stringify(changed));
    assert.equal(api.read(saved.id).survey.name,fixture.name);
    assert.equal(api.read(saved.id).assembly.hash,assembly.hash);
    assert.throws(()=>api.save({...input,name:'Stale review',hash:assembly.hash}),/changed/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
