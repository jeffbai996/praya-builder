// External design agents use this transport without depending on a model provider.
const fs=require('node:fs');
async function main(){
 const [route,file]=process.argv.slice(2);if(!route||!/^[-a-zA-Z0-9/]+$/.test(route))throw Error('Usage: node workspace-cli.cjs context | drafts/<id>/context | <operation> request.json');
 const body=file?fs.readFileSync(file,'utf8'):undefined;if(body&&Buffer.byteLength(body)>12*1024*1024)throw Error('Request limit exceeded');
 const base=process.env.BUILDER_WORKSPACE_URL||'http://127.0.0.1:8091';const url=new URL('/api/workspace/'+route,base);
 const response=await fetch(url,{method:body?'POST':'GET',headers:{'X-Builder-Write':'1','Content-Type':'application/json'},body,signal:AbortSignal.timeout(120000)});
 const output=await response.text();process.stdout.write(output+'\n');if(!response.ok)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
