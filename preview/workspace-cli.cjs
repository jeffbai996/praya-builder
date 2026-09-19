// External agents share the same transport and validation as the studio.
const fs=require('node:fs'),path=require('node:path');
const base=process.env.BUILDER_WORKSPACE_URL||'http://127.0.0.1:8091';
async function request(route,body){
 const response=await fetch(new URL('/api/workspace/'+route,base),{method:body===undefined?'GET':'POST',headers:{'X-Builder-Write':'1','Content-Type':'application/json'},body,signal:AbortSignal.timeout(120000)});
 const output=await response.text();let data;try{data=JSON.parse(output);}catch{throw Error('Workspace returned an invalid JSON response ('+response.status+')');}
 if(!response.ok)throw Error(data.error||'Workspace request failed ('+response.status+')');return data;
}
async function review(id,directory){
 if(!/^[a-z0-9-]{1,80}$/.test(id||''))throw Error('A draft ID is required');
 const context=await request('drafts/'+id+'/context');
 const result={draftId:id,candidateHash:context.candidateHash,author:context.author,diagnosticsVersion:context.diagnosticsVersion,diagnostics:context.diagnostics,access:context.access,siteCaps:context.site?.caps,limits:context.limits,sheet:context.sheet||null};
 const out=path.resolve(directory||'review-'+id);fs.mkdirSync(out,{recursive:true});
 if(context.sheet?.index){
  const prefix='/api/workspace/artifacts/'+context.candidateHash+'/sheet/';
  if(context.sheet.index!==prefix+'index.json')throw Error('Unexpected review sheet path');
  const manifest=await request(context.sheet.index.slice('/api/workspace/'.length));
  for(const view of manifest.views||[]){
   if(!/^[a-z0-9-]+\.png$/.test(view.file)||view.url!==prefix+view.file)throw Error('Unexpected sheet image path');
   const response=await fetch(new URL(view.url,base),{signal:AbortSignal.timeout(65000)});
   if(!response.ok)throw Error('Sheet download failed: '+view.file+' ('+response.status+')');
   fs.writeFileSync(path.join(out,view.file),Buffer.from(await response.arrayBuffer()));
  }
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(manifest,null,2)+'\n');result.sheet=manifest;
 }
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(result,null,2)+'\n');
 return {...result,directory:out};
}
async function main(){
 const [route,file,directory]=process.argv.slice(2);
 if(route==='review'){console.log(JSON.stringify(await review(file,directory),null,2));return;}
 if(!route||!/^[-a-zA-Z0-9/]+$/.test(route))throw Error('Usage: workspace-cli.cjs review <draft-id> [folder] | context | drafts/<id>/context | <operation> request.json');
 const body=file?fs.readFileSync(file,'utf8'):undefined;if(body&&Buffer.byteLength(body)>12*1024*1024)throw Error('Request limit exceeded');
 console.log(JSON.stringify(await request(route,body)));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={request,review};
