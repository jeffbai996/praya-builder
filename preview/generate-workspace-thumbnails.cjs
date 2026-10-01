// Backfill saved-version thumbnails without opening or editing a Studio draft.
// Explicit design keys keep this a bounded maintenance operation, never library-page rendering.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
async function main(){
 const keys=process.argv.slice(2);if(!keys.length||keys.length>24||keys.some(k=>!/^[a-z0-9-]+$/.test(k)))throw Error('Supply 1–24 design keys, e.g. alder-house terraced-brick-residences');
 const base=process.env.PREVIEW_TEST_URL||'http://127.0.0.1:8091';
 async function json(route){const response=await fetch(base+route,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Request failed: '+response.status+' '+route);return response.json();}
 const projects=[];for(let page=0;;page++){const result=await json('/api/workspace/library/projects?size=24&page='+page);projects.push(...result.items);if(page+1>=result.pages)break;}
 const selected=keys.map(key=>{const project=projects.find(p=>p.key===key);if(!project?.revision)throw Error('No matching saved version for '+key);return project;});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage();await page.goto(base+'/thumbnail-render.html');
  for(const project of selected){
   const revision=project.revision,route='/api/workspace/revisions/'+revision.id+'/thumbnail';
   const existing=await fetch(base+route,{signal:AbortSignal.timeout(10000)});
   if(existing.ok){console.log('REUSED '+project.key+' '+revision.id);continue;}
   if(existing.status!==404)throw Error('Thumbnail lookup failed: '+existing.status);
   await page.evaluate(async({route,hash})=>{
    const {versionThumbnail}=await import('/version-thumbs.js');
    const image=await versionThumbnail(hash);
    const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json','X-Builder-Write':'1'},body:JSON.stringify({image})});
    if(!response.ok)throw Error('Thumbnail save failed: '+response.status+' '+await response.text());
   },{route,hash:revision.artifactHash});
   const verified=await fetch(base+route,{signal:AbortSignal.timeout(10000)}),bytes=Buffer.from(await verified.arrayBuffer());
   if(!verified.ok||bytes.length<4||bytes.readUIntBE(0,3)!==0xffd8ff)throw Error('Cached JPEG readback failed');
   console.log('CREATED '+project.key+' '+revision.id+' '+revision.artifactHash+' '+bytes.length+' bytes');
  }
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
