// Opt-in integration against a disposable workspace only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);
async function main(){
 if(process.env.BUILDER_SCRATCH_TEST!=='1')throw Error('Disposable workspace required');
 const base=process.env.BUILDER_WORKSPACE_URL||'http://127.0.0.1:8092',dir=fs.mkdtempSync(path.join(os.tmpdir(),'bakeoff-cli-'));
 const get=async route=>{const response=await fetch(base+'/api/workspace/'+route);const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;};
 try{
  const file=path.join(__dirname,'generated',fs.readdirSync(path.join(__dirname,'generated')).filter(f=>f.endsWith('.plan.json')).sort()[0]);
  const command=[process.execPath,'-e',`process.stdin.resume();process.stdin.on('end',()=>process.stdout.write(require('fs').readFileSync(${JSON.stringify(file)},'utf8')))`];
  const brief={name:'CLI fixture comparison',text:'Two command fixtures, no model calls',entrants:[{agent:'fixture-one',model:'hidden-model-one',effort:'high',command},{agent:'fixture-two',model:'hidden-model-two',effort:'medium',command}]};
  const input=path.join(dir,'brief.json');fs.writeFileSync(input,JSON.stringify(brief));
  const output=await run(process.execPath,[path.join(__dirname,'bakeoff.cjs'),input],{env:{...process.env,BUILDER_WORKSPACE_URL:base},timeout:120000,maxBuffer:4*1024*1024});
  const record=JSON.parse(output.stdout);assert.equal(record.entrants.length,2);assert(record.entrants.every(e=>e.cells>0));assert(!output.stdout.includes('hidden-model'));assert.equal(record.revealed,false);
  assert.notEqual(record.entrants[0].sheet.reviewHash,record.entrants[1].sheet.reviewHash,'blind labels bind separate images');
  const manifest=await get(record.entrants[0].sheet.index.slice('/api/workspace/'.length));assert(manifest.views.length>=10);assert(manifest.views.some(v=>JSON.stringify(v.labels).includes('Entrant A')));
  const response=await fetch(base+'/api/workspace/bakeoffs/'+record.id+'/reveal',{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({expectedVersion:record.version})});assert.equal(response.status,200);const revealed=await response.json();assert.deepEqual(revealed.entrants.map(e=>e.author.model).sort(),['hidden-model-one','hidden-model-two']);assert.equal((await get('bakeoffs/'+record.id)).revealed,true);
  console.log('BAKEOFF_HTTP_PASS id='+record.id+' entries=2 blind=1 reveal=1 sheets='+manifest.views.length);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
