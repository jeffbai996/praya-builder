// Real transport smoke. It uses a disposable workspace and never renders into
// the studio's live .workspace cache.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {FileStore}=require('./workspace-store.cjs');

const run=promisify(execFile);
const node=process.execPath;
function port(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(error=>error?reject(error):resolve(value));});});}
function latestArtifact(){
 const files=fs.readdirSync(path.join(__dirname,'generated')).filter(file=>file.endsWith('.json')&&!file.endsWith('.plan.json')).sort();
 assert(files.length,'a generated artifact is required');return JSON.parse(fs.readFileSync(path.join(__dirname,'generated',files[0]),'utf8'));
}
function legacyDraft(artifact,transform){return {schemaVersion:1,project:`legacy-sheet-${transform.origin.join('-')}`,brief:'HTTP fixture',parentHash:null,baselineHash:artifact.hash,siteId:null,surveyHash:null,transform,candidate:artifact,valid:true,plan:{plan_id:artifact.plan_id,revision:artifact.revision,name:artifact.name,palette:{},components:[],spaces:[]},assemblyBaseline:{},history:[{plan:{plan_id:artifact.plan_id,revision:artifact.revision},candidateHash:artifact.hash,valid:true}],cursor:0};}
async function response(url){const result=await fetch(url);const text=await result.text();let body;try{body=JSON.parse(text);}catch{body=text;}assert.equal(result.status,200,typeof body==='string'?body:JSON.stringify(body));return {headers:result.headers,body};}
async function wait(base,child){for(let attempt=0;attempt<100;attempt++){try{const result=await fetch(base+'/api/health');if(result.ok)return;}catch{}if(child.exitCode!==null)throw Error('Scratch review server exited early');await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Scratch review server did not become ready');}
async function stop(child){if(child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,5000))]);if(child.exitCode===null)child.kill('SIGKILL');}

async function main(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-review-http-')),store=new FileStore(root),artifact=latestArtifact();store.putArtifact(artifact);
 const first=store.create('drafts',legacyDraft(artifact,{origin:[0,0,0],turns:0}));
 const second=store.create('drafts',legacyDraft(artifact,{origin:[8,0,0],turns:1}));
 const selected=await port(),base=`http://127.0.0.1:${selected}`;
 const {BUILDER_BRIDGE_URL,BUILDER_BRIDGE_TOKEN,BUILDER_SURVEY_URL,BUILDER_SURVEY_TOKEN,...cleanEnv}=process.env;
 const child=spawn(node,[path.join(__dirname,'server.cjs')],{cwd:path.resolve(__dirname,'..'),env:{...cleanEnv,PREVIEW_PORT:String(selected),BUILDER_WORKSPACE_DIR:root},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
 try{
  await wait(base,child);
  const firstContext=(await response(`${base}/api/workspace/drafts/${first.id}/context`)).body;
  const secondContext=(await response(`${base}/api/workspace/drafts/${second.id}/context`)).body;
  assert.equal(firstContext.diagnosticsSource,'current-rules');
  assert.notEqual(firstContext.sheet.reviewHash,secondContext.sheet.reviewHash,'same artifact must not reuse another transform’s review context');
  const indexUrl=base+firstContext.sheet.index,firstIndex=await response(indexUrl),repeatIndex=await response(indexUrl);
  assert.deepEqual(repeatIndex.body,firstIndex.body);assert.equal(firstIndex.body.views.filter(view=>view.kind==='exterior').length,6);assert.equal(firstIndex.body.views.filter(view=>view.kind==='elevation').length,4);assert(firstIndex.body.views.some(view=>view.kind==='plan'));
  const image=firstIndex.body.views.find(view=>view.kind==='plan'),imageResponse=await fetch(base+image.url);assert.equal(imageResponse.status,200);const bytes=Buffer.from(await imageResponse.arrayBuffer());assert.equal(image.sha256,require('node:crypto').createHash('sha256').update(bytes).digest('hex'));assert(bytes.length>1000);
  const secondIndex=await response(base+secondContext.sheet.index);assert.equal(secondIndex.body.reviewHash,secondContext.sheet.reviewHash);
  const output=path.join(root,'cli-review');const cli=await run(node,[path.join(__dirname,'workspace-cli.cjs'),'review',first.id,output],{cwd:path.resolve(__dirname,'..'),env:{...process.env,BUILDER_WORKSPACE_URL:base},timeout:120000,maxBuffer:1024*1024});
  const review=JSON.parse(cli.stdout);assert.equal(review.diagnosticsSource,'current-rules');assert(fs.readdirSync(output).some(file=>file.endsWith('.png')),'CLI downloads review images');
  console.log(`REVIEW_SHEETS_HTTP_PASS views=${firstIndex.body.views.length} bytes=${bytes.length} review=${firstContext.sheet.reviewHash.slice(0,12)}`);
 }finally{await stop(child);if(child.exitCode&&child.exitCode!==0)console.error(stderr.slice(-2000));fs.rmSync(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
