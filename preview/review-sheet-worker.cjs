// Single Chromium worker. It only writes inside the staging directory provided
// by ReviewSheetService; the parent atomically publishes a complete sheet.
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {meshArtifact}=require('./mesh.cjs');

const hash=value=>createHash('sha256').update(value).digest('hex');
let browser,stopping=false;
async function close(code){if(stopping)return;stopping=true;try{await browser?.close();}catch{}process.exit(code);}
process.once('SIGTERM',()=>{void close(143);});process.once('SIGINT',()=>{void close(130);});
const image=/^[a-z0-9-]+\.png$/;
const route=(artifactHash,reviewHash,file)=>`/api/workspace/artifacts/${artifactHash}/sheet/${file}?review=${reviewHash}`;
const diagnosticsFor=(diagnostics,view)=>view.kind==='plan'?diagnostics.filter(entry=>Array.isArray(entry.at)&&entry.at[1]>=view.floor-1&&entry.at[1]<view.ceiling):diagnostics;
function write(file,bytes){const temp=`${file}.${process.pid}.tmp`;fs.writeFileSync(temp,bytes,{mode:0o600});fs.renameSync(temp,file);}
async function main(){
 const source=process.argv[2];if(!source)throw Error('Review sheet worker input is required');
 const input=JSON.parse(fs.readFileSync(source,'utf8')),{artifact,review,views,baseUrl,outputDir,rendererVersion}=input;
 if(!artifact?.hash||!review?.reviewHash||!Array.isArray(views)||!baseUrl||!outputDir)throw Error('Invalid review sheet worker input');
 if(!path.isAbsolute(outputDir)||!fs.existsSync(outputDir))throw Error('Invalid review sheet staging directory');
 const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto(new URL('/thumbnail-render.html',baseUrl).href,{waitUntil:'load'});
  const manifestViews=[];
  for(const view of views){
   if(!image.test(view.file))throw Error('Invalid review sheet image name');
   const mesh=meshArtifact(artifact,view.ceiling),diagnostics=diagnosticsFor(review.diagnostics||[],view);
   const rendered=await page.evaluate(async payload=>{
    const {renderReviewView}=await import('/review-sheet-render.js');return renderReviewView(payload);
   },{mesh,view,dimensions:artifact.dimensions,diagnostics,components:artifact.components||[],name:review.reviewLabel||artifact.name,artifactHash:artifact.hash});
   if(rendered?.hash!==artifact.hash||typeof rendered.png!=='string'||!rendered.png.startsWith('data:image/png;base64,'))throw Error(`Renderer returned an invalid image for ${view.id}`);
   const bytes=Buffer.from(rendered.png.slice('data:image/png;base64,'.length),'base64');if(bytes.length<8||bytes.subarray(1,4).toString('ascii')!=='PNG')throw Error(`Renderer returned invalid PNG bytes for ${view.id}`);
   write(path.join(outputDir,view.file),bytes);
   manifestViews.push({...view,url:route(artifact.hash,review.reviewHash,view.file),sha256:hash(bytes),pngHash:rendered.pngHash||hash(bytes),markers:rendered.markerItems||[],diagnosticCount:rendered.diagnosticCount??diagnostics.length,labels:rendered.labels||null,projection:rendered.projection||null});
  }
  write(path.join(outputDir,'index.json'),Buffer.from(JSON.stringify({schemaVersion:1,artifactHash:artifact.hash,reviewHash:review.reviewHash,rendererVersion,diagnosticsVersion:review.diagnosticsVersion,diagnosticsSource:review.diagnosticsSource,views:manifestViews},null,2)+'\n'));
 }finally{await browser?.close();browser=null;}
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
