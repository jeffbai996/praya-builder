// End-to-end CLI verification. Run only against a disposable workspace on port 8092.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),exec=promisify(require('node:child_process').execFile);
async function main(){
 const base=process.env.BUILDER_WORKSPACE_URL;assert.equal(new URL(base).port,'8092','Use the isolated scratch workspace');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-cli-roundtrip-'));
 const author={agent:'astra',model:'contract-fixture',effort:'high',note:'Isolated CLI acceptance fixture'};
 const plan={schema_version:1,plan_id:'roundtrip-'+Date.now(),revision:'r0',name:'CLI round trip',description:'Isolated compiler fixture',dimensions:{x:3,y:3,z:3},palette:{wall:'minecraft:stone'},components:[{id:'shell',role:'Envelope',origin:[0,0,0],operations:[{op:'box',min:[0,0,0],max:[3,3,3],material:'wall'}]}],spaces:[]};
 const cli=async(route,body)=>{const args=[path.join(__dirname,'workspace-cli.cjs'),route];if(body){const file=path.join(root,'request.json');fs.writeFileSync(file,JSON.stringify(body));args.push(file);}return JSON.parse((await exec(process.execPath,args,{env:process.env,maxBuffer:16*1024*1024})).stdout);};
 try{
  let draft=await cli('drafts',{plan,author});assert.equal(draft.valid,true,JSON.stringify(draft.diagnostics));
  const review=async()=>JSON.parse((await exec(process.execPath,[path.join(__dirname,'workspace-cli.cjs'),'review',draft.id,path.join(root,'review')],{env:process.env})).stdout);
  assert.equal((await review()).candidateHash,draft.candidate.hash);
  const editor={...author,agent:'revision-agent',effort:'medium'};
  draft=await cli('drafts/'+draft.id+'/edit',{expectedVersion:draft.version,palette:{wall:'minecraft:quartz_block'},author:editor});assert.deepEqual(draft.author,editor);
  assert.equal((await review()).candidateHash,draft.candidate.hash);
  const saved=await cli('drafts/'+draft.id+'/save',{expectedVersion:draft.version,candidateHash:draft.candidate.hash,idempotencyKey:'roundtrip-save'});
  assert.deepEqual(saved.author,editor);assert.deepEqual(saved.diagnostics,draft.diagnostics);
  assert.equal((await cli('context')).revisions.find(r=>r.id===saved.id).artifactHash,draft.candidate.hash);
  console.log('AGENT_ROUNDTRIP_PASS real compiler, CLI post/review/edit/review/save, provenance and diagnostic snapshot; no world endpoints');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
