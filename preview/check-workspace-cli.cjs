const {test}=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {promisify}=require('node:util'),exec=promisify(require('node:child_process').execFile);
test('agent CLI reviews structured diagnostics and posts the exact author through the common API',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'builder-cli-')),received=[];
 const context={draftId:'fixture',candidateHash:'a'.repeat(64),author:{agent:'astra',model:'fixture',effort:'high'},diagnosticsVersion:1,diagnostics:[{rule:'walk.door-unreachable',version:1,severity:'error',at:[13,5,10],message:'Blocked flight',hint:'Clear the infill'}],site:{caps:{surveyTopExclusive:112}},limits:{buildCells:10000}};
 const server=http.createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;received.push({url:req.url,method:req.method,header:req.headers['x-builder-write'],body});res.setHeader('Content-Type','application/json');if(req.url==='/api/workspace/drafts/fixture/context')res.end(JSON.stringify(context));else if(req.url==='/api/workspace/drafts')res.end(JSON.stringify({id:'new',...JSON.parse(body)}));else{res.statusCode=404;res.end(JSON.stringify({error:'No such draft'}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const env={...process.env,BUILDER_WORKSPACE_URL:'http://127.0.0.1:'+server.address().port};
 const run=(...args)=>exec(process.execPath,[path.join(__dirname,'workspace-cli.cjs'),...args],{env});
 try{
  const out=path.join(root,'review');const result=JSON.parse((await run('review','fixture',out)).stdout);
  assert.deepEqual(result.diagnostics,context.diagnostics);assert.deepEqual(result.author,context.author);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'review.json'))).siteCaps,context.site.caps);
  const file=path.join(root,'request.json'),input={plan:{name:'fixture'},author:context.author};fs.writeFileSync(file,JSON.stringify(input));
  await run('drafts',file);const posted=received.at(-1);assert.equal(posted.method,'POST');assert.equal(posted.header,'1');assert.deepEqual(JSON.parse(posted.body),input);
  await assert.rejects(run('drafts/missing/context'),error=>error.stderr.includes('No such draft'));
  await assert.rejects(run('review','../escape',out),error=>error.stderr.includes('draft ID'));
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
});
