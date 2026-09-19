const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {BakeoffService}=require('./bakeoff-service.cjs'),{FileStore}=require('./workspace-store.cjs'),{runEntrant,validateCommand}=require('./bakeoff.cjs');
test('durable blind comparison uses compiled metrics, records provenance, and reveals explicitly',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-bakeoff-')),store=new FileStore(root),calls=[];
 const service={async createDraft(input){calls.push(input);return {id:'draft-'+calls.length,candidate:{hash:'a'.repeat(64),blocks:[{}],components:[{}]},diagnostics:[{severity:'warning'}],access:{valid:true},valid:true};}};
 const sheets={describe(ref){assert.match(ref.reviewLabel,/^Entrant [A-F]$/);return {index:'/sheet/'+ref.reviewLabel};}};
 const bakeoffs=new BakeoffService({store,service,sheets});
 try{
  const record=bakeoffs.create({brief:{text:'Compact apartment'},entrants:[{agent:'first',model:'model-one'},{agent:'second',model:'model-two'}]});
  assert(!JSON.stringify(bakeoffs.view(record)).includes('model-one'));
  const updated=await bakeoffs.submit(record.id,{expectedVersion:1,label:'A',plan:{fixture:true}});
  assert.equal(updated.entrants[0].cells,1);assert.deepEqual(updated.entrants[0].diagnostics,{error:0,warning:1,info:0});assert.equal(calls[0].author.model,'model-one');
  assert.equal(new FileStore(root).get('bakeoffs',record.id).entrants[0].artifactHash,'a'.repeat(64));
  const blind=bakeoffs.view(updated);assert(!JSON.stringify(blind).includes('model-one'));assert.equal(blind.entrants[0].draftId,undefined);
  await assert.rejects(bakeoffs.submit(record.id,{expectedVersion:1,label:'B',failure:true}),/changed/);
  const failed=await bakeoffs.submit(record.id,{expectedVersion:2,label:'B',failure:true});assert.equal(failed.entrants[1].state,'failed');
  const revealed=bakeoffs.view(await bakeoffs.reveal(record.id,{expectedVersion:3}));assert.equal(revealed.entrants[0].author.model,'model-one');assert.equal(revealed.entrants[0].draftId,'draft-1');
  await assert.rejects(bakeoffs.submit(record.id,{expectedVersion:4,label:'A',failure:true}),/not pending/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('entrant process receives brief on stdin and bounds malformed, oversized and slow output',async()=>{
 const command=code=>[process.execPath,'-e',code];
 const plan=await runEntrant(command("let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>console.log(JSON.stringify({name:JSON.parse(s).text})))"),{text:'Fixture'});
 assert.equal(plan.name,'Fixture');
 await assert.rejects(runEntrant(command("console.log('not json')"),{}),/stdout/);
 await assert.rejects(runEntrant(command("process.stdout.write('x'.repeat(1048577))"),{}),/1 MiB/);
 await assert.rejects(runEntrant(command('setInterval(()=>{},100)'),{},{timeoutMs:1000}),/timed out/);
});

test('comparison queue and command admission are bounded before work starts',async()=>{
 assert.throws(()=>validateCommand(['node', 'x'.repeat(4001)]),/command/);
 assert.throws(()=>validateCommand(Array(41).fill('node')),/command/);
 assert.throws(()=>validateCommand(['node'],0),/timeout/);
 let release;const blocked=new Promise(resolve=>{release=resolve;});
 const service=new BakeoffService({store:{},service:{},sheets:{}});
 const admitted=Array.from({length:4},()=>service.enqueue(()=>blocked));
 await assert.rejects(service.enqueue(()=>{}),error=>error.status===429);
 release();await Promise.all(admitted);assert.equal(service.pending,0);
});
